using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Tipolox.LitGrid.Blazor;

[JsonConverter(typeof(EnumMemberJsonConverter<GridTheme>))]
public enum GridTheme
{
    [EnumMember(Value = "light")]
    Light,

    [EnumMember(Value = "dark")]
    Dark
}

[JsonConverter(typeof(EnumMemberJsonConverter<SelectionMode>))]
public enum SelectionMode
{
    [EnumMember(Value = "none")]
    None,

    [EnumMember(Value = "row")]
    Row,

    [EnumMember(Value = "multi-row")]
    MultiRow,

    [EnumMember(Value = "cell")]
    Cell,

    [EnumMember(Value = "multi-cell")]
    MultiCell
}

[JsonConverter(typeof(EnumMemberJsonConverter<SelectionIntent>))]
public enum SelectionIntent
{
    [EnumMember(Value = "replace")]
    Replace,

    [EnumMember(Value = "toggle")]
    Toggle,

    [EnumMember(Value = "range")]
    Range
}

[JsonConverter(typeof(EnumMemberJsonConverter<FilterOperator>))]
public enum FilterOperator
{
    [EnumMember(Value = "contains")]
    Contains,

    [EnumMember(Value = "equals")]
    Equals,

    [EnumMember(Value = "startsWith")]
    StartsWith,

    [EnumMember(Value = "endsWith")]
    EndsWith,

    [EnumMember(Value = "isEmpty")]
    IsEmpty,

    [EnumMember(Value = "isNotEmpty")]
    IsNotEmpty,

    [EnumMember(Value = "greaterThan")]
    GreaterThan,

    [EnumMember(Value = "greaterThanOrEqual")]
    GreaterThanOrEqual,

    [EnumMember(Value = "lessThan")]
    LessThan,

    [EnumMember(Value = "lessThanOrEqual")]
    LessThanOrEqual
}

[JsonConverter(typeof(EnumMemberJsonConverter<ColumnStateChangeReason>))]
public enum ColumnStateChangeReason
{
    [EnumMember(Value = "resize")]
    Resize,

    [EnumMember(Value = "reorder")]
    Reorder,

    [EnumMember(Value = "visibility")]
    Visibility,

    [EnumMember(Value = "restore")]
    Restore,

    [EnumMember(Value = "reset")]
    Reset,

    [EnumMember(Value = "set")]
    Set
}
