namespace Tipolox.LitGrid.Blazor;

internal sealed class ColumnAlignmentException(string message) : ArgumentException(message);

internal static class ColumnAlignment
{
    internal static string? Validate(string? align, string key)
    {
        if (align is not (null or "start" or "center" or "end" or "left" or "right"))
            throw new ColumnAlignmentException($"Column '{key}': invalid alignment '{align}'.");
        return align;
    }
}
