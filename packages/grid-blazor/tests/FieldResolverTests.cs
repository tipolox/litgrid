using System.Linq.Expressions;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace Tipolox.LitGrid.Blazor.Tests;

public class EmployeeBase
{
    public int Id { get; set; }
}

public class Employee : EmployeeBase
{
    [JsonPropertyName("employee_name")] public string? Name { get; set; }
    public string? Department { get; set; }
    public decimal Salary { get; set; }
    public DateTime Joined { get; set; }
    public bool Active { get; set; }
    public int? Score { get; set; }
    [JsonIgnore] public string Ignored { get; set; } = "ignored";
    public Employee? Manager { get; set; }
    public string this[int index] => index.ToString();
    public string WriteOnly { set { } }
    public string PublicField = "field";
}

public class FieldResolverTests
{
    [Fact]
    public void ResolvesSerializedNamesAndScalarTypes()
    {
        Assert.Equal("id", FieldResolver.Resolve<Employee>(e => e.Id));
        Assert.Equal("id", FieldResolver.Resolve<Employee>(e => (long)e.Id));
        Assert.Equal("employee_name", FieldResolver.Resolve<Employee>(e => e.Name));
        Assert.Equal("department", FieldResolver.Resolve<Employee>(e => e.Department));
        Assert.Equal("salary", FieldResolver.Resolve<Employee>(e => e.Salary));
        Assert.Equal("joined", FieldResolver.Resolve<Employee>(e => e.Joined));
        Assert.Equal("active", FieldResolver.Resolve<Employee>(e => e.Active));
        Assert.Equal("score", FieldResolver.Resolve<Employee>(e => e.Score));
        var data = JsonSerializer.SerializeToElement(new Employee { Id = 3, Name = "Ada" }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.Equal(3, data.GetProperty(FieldResolver.Resolve<Employee>(e => e.Id)).GetInt32());
        Assert.Equal("Ada", data.GetProperty(FieldResolver.Resolve<Employee>(e => e.Name)).GetString());
        Assert.Equal(JsonValueKind.Null, data.GetProperty(FieldResolver.Resolve<Employee>(e => e.Department)).ValueKind);
    }

    [Fact]
    public void RejectsPropertiesThatAreNotPartOfScalarOrCollectionRowSerialization()
    {
        Assert.Throws<ArgumentException>(() => FieldResolver.Resolve<string>(value => value.Length));
        Assert.Throws<ArgumentException>(() => FieldResolver.Resolve<DateTime>(value => value.Year));
        Assert.Throws<ArgumentException>(() => FieldResolver.Resolve<DateTime?>(value => value.HasValue));
        Assert.Throws<ArgumentException>(() => FieldResolver.Resolve<Dictionary<string, int>>(value => value.Count));
        Assert.Throws<ArgumentException>(() => FieldResolver.Resolve<Uri>(value => value.Host));
        Assert.Throws<ArgumentException>(() => FieldResolver.Resolve<JsonElement>(value => value.ValueKind));
    }

    public static IEnumerable<object[]> Unsupported()
    {
        Expression<Func<Employee, object?>>[] fields = [
            e => e.Id + 1, e => e.Name!.ToUpper(), e => e.Manager!.Name,
            e => e[0], e => e.Ignored, e => e.Manager, e => e.PublicField,
            e => 1, e => e, e => new Employee().Id
        ];
        return fields.Select(field => new object[] { field });
    }

    [Theory]
    [MemberData(nameof(Unsupported))]
    public void RejectsUnsupportedExpressions(Expression<Func<Employee, object?>> field)
        => Assert.Throws<ArgumentException>(() => FieldResolver.Resolve(field));

    [Theory]
    [InlineData(80, 80d)]
    [InlineData("80", 80d)]
    [InlineData("80px", 80d)]
    [InlineData("120.5px", 120.5d)]
    public void NormalizesRazorPixelWidths(object width, double expected)
        => Assert.Equal(expected, LitGridColumn<Employee>.NormalizeWidth(width));

    [Theory]
    [InlineData("20%")]
    [InlineData("auto")]
    [InlineData(-1)]
    [InlineData(0)]
    [InlineData(double.NaN)]
    [InlineData(double.PositiveInfinity)]
    [InlineData(true)]
    public void RejectsInvalidWidths(object width)
        => Assert.Throws<ArgumentException>(() => LitGridColumn<Employee>.NormalizeWidth(width));
}
