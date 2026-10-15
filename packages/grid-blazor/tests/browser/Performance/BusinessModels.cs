using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BrowserHost.Performance;

public class AccountRow6
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Balance { get; set; }
    public DateTime Joined { get; set; }
    public string? Department { get; set; }
    public bool Active { get; set; }
    public AccountRow6() { }
    public AccountRow6(int id)
    {
        Id = id; Name = $"Account {id} — 東京 😀"; Balance = id * 12.34m;
        Joined = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(id % 700);
        Department = id % 5 == 0 ? null : $"Department {id % 12}";
        Active = id % 3 != 0;
    }
}

public enum AccountStatus { Active, Suspended }
public sealed class AccountRow10 : AccountRow6
{
    [JsonPropertyName("account_alias")]
    public string Alias { get; set; } = "";
    public AccountStatus Status { get; set; }
    public double Ratio { get; set; }
    public int? Rating { get; set; }
    public AccountRow10(int id) : base(id)
    {
        Alias = $"Alias \"{id}\"\\line\n";
        Status = id % 2 == 0 ? AccountStatus.Active : AccountStatus.Suspended;
        Ratio = id / 7.0; Rating = id % 4 == 0 ? null : id % 10;
    }
}

public sealed class AccountRow120 : AccountRow6
{
    public decimal Balance001 { get; set; }
    public decimal Balance002 { get; set; }
    public decimal Balance003 { get; set; }
    public decimal Balance004 { get; set; }
    public decimal Balance005 { get; set; }
    public decimal Balance006 { get; set; }
    public decimal Balance007 { get; set; }
    public decimal Balance008 { get; set; }
    public decimal Balance009 { get; set; }
    public decimal Balance010 { get; set; }
    public decimal Balance011 { get; set; }
    public decimal Balance012 { get; set; }
    public decimal Balance013 { get; set; }
    public decimal Balance014 { get; set; }
    public decimal Balance015 { get; set; }
    public decimal Balance016 { get; set; }
    public decimal Balance017 { get; set; }
    public decimal Balance018 { get; set; }
    public decimal Balance019 { get; set; }
    public decimal Balance020 { get; set; }
    public decimal Balance021 { get; set; }
    public decimal Balance022 { get; set; }
    public decimal Balance023 { get; set; }
    public decimal Balance024 { get; set; }
    public decimal Balance025 { get; set; }
    public decimal Balance026 { get; set; }
    public decimal Balance027 { get; set; }
    public decimal Balance028 { get; set; }
    public decimal Balance029 { get; set; }
    public decimal Balance030 { get; set; }
    public decimal Balance031 { get; set; }
    public decimal Balance032 { get; set; }
    public decimal Balance033 { get; set; }
    public decimal Balance034 { get; set; }
    public decimal Balance035 { get; set; }
    public decimal Balance036 { get; set; }
    public decimal Balance037 { get; set; }
    public decimal Balance038 { get; set; }
    public decimal Balance039 { get; set; }
    public decimal Balance040 { get; set; }
    public decimal Balance041 { get; set; }
    public decimal Balance042 { get; set; }
    public decimal Balance043 { get; set; }
    public decimal Balance044 { get; set; }
    public decimal Balance045 { get; set; }
    public decimal Balance046 { get; set; }
    public decimal Balance047 { get; set; }
    public decimal Balance048 { get; set; }
    public decimal Balance049 { get; set; }
    public decimal Balance050 { get; set; }
    public decimal Balance051 { get; set; }
    public decimal Balance052 { get; set; }
    public decimal Balance053 { get; set; }
    public decimal Balance054 { get; set; }
    public decimal Balance055 { get; set; }
    public decimal Balance056 { get; set; }
    public decimal Balance057 { get; set; }
    public decimal Balance058 { get; set; }
    public decimal Balance059 { get; set; }
    public decimal Balance060 { get; set; }
    public decimal Balance061 { get; set; }
    public decimal Balance062 { get; set; }
    public decimal Balance063 { get; set; }
    public decimal Balance064 { get; set; }
    public decimal Balance065 { get; set; }
    public decimal Balance066 { get; set; }
    public decimal Balance067 { get; set; }
    public decimal Balance068 { get; set; }
    public decimal Balance069 { get; set; }
    public decimal Balance070 { get; set; }
    public decimal Balance071 { get; set; }
    public decimal Balance072 { get; set; }
    public decimal Balance073 { get; set; }
    public decimal Balance074 { get; set; }
    public decimal Balance075 { get; set; }
    public decimal Balance076 { get; set; }
    public decimal Balance077 { get; set; }
    public decimal Balance078 { get; set; }
    public decimal Balance079 { get; set; }
    public decimal Balance080 { get; set; }
    public decimal Balance081 { get; set; }
    public decimal Balance082 { get; set; }
    public decimal Balance083 { get; set; }
    public decimal Balance084 { get; set; }
    public decimal Balance085 { get; set; }
    public decimal Balance086 { get; set; }
    public decimal Balance087 { get; set; }
    public decimal Balance088 { get; set; }
    public decimal Balance089 { get; set; }
    public decimal Balance090 { get; set; }
    public decimal Balance091 { get; set; }
    public decimal Balance092 { get; set; }
    public decimal Balance093 { get; set; }
    public decimal Balance094 { get; set; }
    public decimal Balance095 { get; set; }
    public decimal Balance096 { get; set; }
    public decimal Balance097 { get; set; }
    public decimal Balance098 { get; set; }
    public decimal Balance099 { get; set; }
    public decimal Balance100 { get; set; }
    public decimal Balance101 { get; set; }
    public decimal Balance102 { get; set; }
    public decimal Balance103 { get; set; }
    public decimal Balance104 { get; set; }
    public decimal Balance105 { get; set; }
    public decimal Balance106 { get; set; }
    public decimal Balance107 { get; set; }
    public decimal Balance108 { get; set; }
    public decimal Balance109 { get; set; }
    public decimal Balance110 { get; set; }
    public decimal Balance111 { get; set; }
    public decimal Balance112 { get; set; }
    public decimal Balance113 { get; set; }
    public decimal Balance114 { get; set; }
    public AccountRow120(int id) : base(id)
    {
        Balance001 = id * 0.5m + 1;
        Balance002 = id * 0.5m + 2;
        Balance003 = id * 0.5m + 3;
        Balance004 = id * 0.5m + 4;
        Balance005 = id * 0.5m + 5;
        Balance006 = id * 0.5m + 6;
        Balance007 = id * 0.5m + 7;
        Balance008 = id * 0.5m + 8;
        Balance009 = id * 0.5m + 9;
        Balance010 = id * 0.5m + 10;
        Balance011 = id * 0.5m + 11;
        Balance012 = id * 0.5m + 12;
        Balance013 = id * 0.5m + 13;
        Balance014 = id * 0.5m + 14;
        Balance015 = id * 0.5m + 15;
        Balance016 = id * 0.5m + 16;
        Balance017 = id * 0.5m + 17;
        Balance018 = id * 0.5m + 18;
        Balance019 = id * 0.5m + 19;
        Balance020 = id * 0.5m + 20;
        Balance021 = id * 0.5m + 21;
        Balance022 = id * 0.5m + 22;
        Balance023 = id * 0.5m + 23;
        Balance024 = id * 0.5m + 24;
        Balance025 = id * 0.5m + 25;
        Balance026 = id * 0.5m + 26;
        Balance027 = id * 0.5m + 27;
        Balance028 = id * 0.5m + 28;
        Balance029 = id * 0.5m + 29;
        Balance030 = id * 0.5m + 30;
        Balance031 = id * 0.5m + 31;
        Balance032 = id * 0.5m + 32;
        Balance033 = id * 0.5m + 33;
        Balance034 = id * 0.5m + 34;
        Balance035 = id * 0.5m + 35;
        Balance036 = id * 0.5m + 36;
        Balance037 = id * 0.5m + 37;
        Balance038 = id * 0.5m + 38;
        Balance039 = id * 0.5m + 39;
        Balance040 = id * 0.5m + 40;
        Balance041 = id * 0.5m + 41;
        Balance042 = id * 0.5m + 42;
        Balance043 = id * 0.5m + 43;
        Balance044 = id * 0.5m + 44;
        Balance045 = id * 0.5m + 45;
        Balance046 = id * 0.5m + 46;
        Balance047 = id * 0.5m + 47;
        Balance048 = id * 0.5m + 48;
        Balance049 = id * 0.5m + 49;
        Balance050 = id * 0.5m + 50;
        Balance051 = id * 0.5m + 51;
        Balance052 = id * 0.5m + 52;
        Balance053 = id * 0.5m + 53;
        Balance054 = id * 0.5m + 54;
        Balance055 = id * 0.5m + 55;
        Balance056 = id * 0.5m + 56;
        Balance057 = id * 0.5m + 57;
        Balance058 = id * 0.5m + 58;
        Balance059 = id * 0.5m + 59;
        Balance060 = id * 0.5m + 60;
        Balance061 = id * 0.5m + 61;
        Balance062 = id * 0.5m + 62;
        Balance063 = id * 0.5m + 63;
        Balance064 = id * 0.5m + 64;
        Balance065 = id * 0.5m + 65;
        Balance066 = id * 0.5m + 66;
        Balance067 = id * 0.5m + 67;
        Balance068 = id * 0.5m + 68;
        Balance069 = id * 0.5m + 69;
        Balance070 = id * 0.5m + 70;
        Balance071 = id * 0.5m + 71;
        Balance072 = id * 0.5m + 72;
        Balance073 = id * 0.5m + 73;
        Balance074 = id * 0.5m + 74;
        Balance075 = id * 0.5m + 75;
        Balance076 = id * 0.5m + 76;
        Balance077 = id * 0.5m + 77;
        Balance078 = id * 0.5m + 78;
        Balance079 = id * 0.5m + 79;
        Balance080 = id * 0.5m + 80;
        Balance081 = id * 0.5m + 81;
        Balance082 = id * 0.5m + 82;
        Balance083 = id * 0.5m + 83;
        Balance084 = id * 0.5m + 84;
        Balance085 = id * 0.5m + 85;
        Balance086 = id * 0.5m + 86;
        Balance087 = id * 0.5m + 87;
        Balance088 = id * 0.5m + 88;
        Balance089 = id * 0.5m + 89;
        Balance090 = id * 0.5m + 90;
        Balance091 = id * 0.5m + 91;
        Balance092 = id * 0.5m + 92;
        Balance093 = id * 0.5m + 93;
        Balance094 = id * 0.5m + 94;
        Balance095 = id * 0.5m + 95;
        Balance096 = id * 0.5m + 96;
        Balance097 = id * 0.5m + 97;
        Balance098 = id * 0.5m + 98;
        Balance099 = id * 0.5m + 99;
        Balance100 = id * 0.5m + 100;
        Balance101 = id * 0.5m + 101;
        Balance102 = id * 0.5m + 102;
        Balance103 = id * 0.5m + 103;
        Balance104 = id * 0.5m + 104;
        Balance105 = id * 0.5m + 105;
        Balance106 = id * 0.5m + 106;
        Balance107 = id * 0.5m + 107;
        Balance108 = id * 0.5m + 108;
        Balance109 = id * 0.5m + 109;
        Balance110 = id * 0.5m + 110;
        Balance111 = id * 0.5m + 111;
        Balance112 = id * 0.5m + 112;
        Balance113 = id * 0.5m + 113;
        Balance114 = id * 0.5m + 114;
    }
}

public sealed class NestedRow
{
    public int Id { get; set; } = 42;
    public Dictionary<string, object?> Values { get; set; } = new()
        { ["unicode"] = "中文😀", ["null"] = null, ["number"] = 123.45m };
    public AccountRow6 Child { get; set; } = new(3);
    public Currency Amount { get; set; } = new(19.99m);
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public AccountStatus Status { get; set; } = AccountStatus.Suspended;
}

[JsonConverter(typeof(CurrencyConverter))]
public record Currency(decimal Amount);

public sealed class CurrencyConverter : JsonConverter<Currency>
{
    public override Currency Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
        => new(decimal.Parse(reader.GetString()!, CultureInfo.InvariantCulture));
    public override void Write(Utf8JsonWriter writer, Currency value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.Amount.ToString("0.00", CultureInfo.InvariantCulture));
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(Customer), "customer")]
public abstract class Party { public int Id { get; set; } }
public sealed class Customer : Party { public string Company { get; set; } = "東京"; }

[JsonConverter(typeof(CustomCollectionConverter))]
public sealed class CustomCollection : List<AccountRow6> { }
public sealed class CustomCollectionConverter : JsonConverter<CustomCollection>
{
    public override CustomCollection Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions options)
        => throw new NotSupportedException();
    public override void Write(Utf8JsonWriter writer, CustomCollection value, JsonSerializerOptions options)
        => writer.WriteStringValue("collection-transformed");
}
