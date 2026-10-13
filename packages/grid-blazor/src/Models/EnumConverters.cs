using System.Reflection;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

public class EnumMemberJsonConverter<[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicFields)] TEnum> : JsonConverter<TEnum> where TEnum : struct, Enum
{
    private readonly Dictionary<TEnum, string> _enumToString = new();
    private readonly Dictionary<string, TEnum> _stringToEnum = new(StringComparer.OrdinalIgnoreCase);

    public EnumMemberJsonConverter()
    {
        var type = typeof(TEnum);
        foreach (var value in Enum.GetValues<TEnum>())
        {
            // Release WebAssembly trims reflection metadata. Keep the enum fields
            // (and their EnumMember attributes) needed for the public wire values.
            var memberInfo = type.GetField(value.ToString());
            var enumMemberAttribute = memberInfo?.GetCustomAttribute<EnumMemberAttribute>();
            var stringValue = enumMemberAttribute?.Value ?? value.ToString();

            _enumToString[value] = stringValue;
            _stringToEnum[stringValue] = value;
        }
    }

    public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var stringValue = reader.GetString();
        if (stringValue != null && _stringToEnum.TryGetValue(stringValue, out var enumValue))
        {
            return enumValue;
        }

        return default;
    }

    public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
    {
        if (_enumToString.TryGetValue(value, out var stringValue))
        {
            writer.WriteStringValue(stringValue);
        }
        else
        {
            writer.WriteStringValue(value.ToString());
        }
    }
}
