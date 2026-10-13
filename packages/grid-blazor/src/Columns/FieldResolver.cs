using System.Linq.Expressions;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

internal static class FieldResolver
{
    private sealed record Mapping(string Key);
    private static readonly ConditionalWeakTable<PropertyInfo, Mapping> Mappings = new();
    private static class RowMetadata<TItem>
    {
        internal static readonly bool HasCustomConverter = typeof(TItem).IsDefined(typeof(JsonConverterAttribute));
        internal static readonly bool HasPropertyShape = Nullable.GetUnderlyingType(typeof(TItem)) == null &&
            !typeof(System.Collections.IEnumerable).IsAssignableFrom(typeof(TItem)) &&
            !typeof(TItem).IsPrimitive && !typeof(TItem).IsEnum && typeof(TItem) != typeof(decimal) &&
            typeof(TItem) != typeof(DateTime) && typeof(TItem) != typeof(DateTimeOffset) &&
            typeof(TItem) != typeof(DateOnly) && typeof(TItem) != typeof(TimeOnly) &&
            typeof(TItem) != typeof(TimeSpan) && typeof(TItem) != typeof(Guid) &&
            typeof(TItem) != typeof(Uri) && typeof(TItem) != typeof(Version) && typeof(TItem) != typeof(JsonElement);
    }

    internal static string Resolve<TItem>(Expression<Func<TItem, object?>> field)
    {
        if (RowMetadata<TItem>.HasCustomConverter)
            throw new ArgumentException("LitGridColumn Field cannot resolve a row type with a custom JSON converter. Use Key without Field.", nameof(field));
        if (!RowMetadata<TItem>.HasPropertyShape)
            throw new ArgumentException("LitGridColumn Field requires rows serialized as objects with public properties. Use Key without Field for scalar or collection rows.", nameof(field));
        Expression body = field.Body;
        while (body is UnaryExpression { NodeType: ExpressionType.Convert or ExpressionType.ConvertChecked, Method: null } conversion)
            body = conversion.Operand;

        if (body is not MemberExpression { Member: PropertyInfo property } member ||
            member.Expression != field.Parameters[0] || property.GetIndexParameters().Length != 0 ||
            property.GetMethod is not { IsPublic: true, IsStatic: false })
            throw new ArgumentException("LitGridColumn Field must select a direct, readable public property. Nested properties, methods, indexers and computed expressions are unsupported.", nameof(field));

        return Mappings.GetValue(property, static property =>
        {
            if (property.GetCustomAttribute<JsonIgnoreAttribute>() is { Condition: not JsonIgnoreCondition.Never } ||
                property.IsDefined(typeof(JsonExtensionDataAttribute)) ||
                property.IsDefined(typeof(JsonConverterAttribute)) ||
                property.DeclaringType!.IsDefined(typeof(JsonConverterAttribute)))
                throw new ArgumentException("LitGridColumn Field cannot resolve ignored properties or custom JSON converters. Use Key without Field for custom serialization.");

            var type = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
            if (type == typeof(IntPtr) || type == typeof(UIntPtr) ||
                !(type.IsPrimitive || type.IsEnum || type == typeof(string) || type == typeof(decimal) ||
                type == typeof(DateTime) || type == typeof(DateTimeOffset) || type == typeof(DateOnly) ||
                type == typeof(TimeOnly) || type == typeof(TimeSpan) || type == typeof(Guid)))
                throw new ArgumentException("LitGridColumn Field supports scalar properties only. Use Key without Field for custom serialization.");

            var key = property.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name ?? JsonNamingPolicy.CamelCase.ConvertName(property.Name);
            if (string.IsNullOrWhiteSpace(key))
                throw new ArgumentException("LitGridColumn requires a nonempty serialized property name.");
            return new Mapping(key);
        }).Key;
    }
}
