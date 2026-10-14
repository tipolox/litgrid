namespace Tipolox.LitGrid.Blazor;

/// <summary>Controls the dataset change contract; column/configuration synchronization is independent.</summary>
public enum DataSyncMode
{
    /// <summary>Synchronize replacements, notifications, revision changes and explicit refreshes.</summary>
    Automatic,
    /// <summary>Also synchronize every parent parameter update when DataRevision is null (v1.0.3 behavior).</summary>
    Legacy
}
