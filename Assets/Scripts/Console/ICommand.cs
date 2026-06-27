using UnityEngine;

/// <summary>
/// A single Reality Console command (delete, clone, gravity, freeze, ...).
/// Each command is a self-contained rule: what it costs in corruption, whether it
/// can run on a given target, and what it does. New commands — including ones the
/// player unlocks from fallen predecessor debuggers — just implement this interface
/// and register with the <see cref="CommandParser"/>.
/// </summary>
public interface ICommand
{
    /// <summary>Lowercase name typed in the console, e.g. "delete".</summary>
    string CommandName { get; }

    /// <summary>Corruption added to the global meter when this command executes.</summary>
    float CorruptionCost { get; }

    /// <summary>
    /// True if the command may run against <paramref name="target"/> with the given
    /// argument. <paramref name="arg"/> is the raw text inside the parentheses
    /// (e.g. "0.3" for gravity(0.3)); it may be empty.
    /// </summary>
    bool CanExecute(GameObject target, string arg);

    /// <summary>Performs the world change. Called only after <see cref="CanExecute"/> passes.</summary>
    void Execute(GameObject target, string arg);
}
