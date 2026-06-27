using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEngine;

/// <summary>
/// Parses raw console input of the form <c>name(arg)</c> (the argument and the
/// parentheses are optional, so <c>delete</c> and <c>delete()</c> and
/// <c>gravity(0.3)</c> are all valid) into a registered <see cref="ICommand"/>.
///
/// Commands live in a registry and can be locked/unlocked, which is how the player
/// gains new abilities over the game (e.g. recovered from Debugger-02/03/04). The
/// parser never throws — invalid or locked input returns false with an error string
/// the console shows in red.
/// </summary>
public class CommandParser : MonoBehaviour
{
    // name -> command implementation
    private readonly Dictionary<string, ICommand> commands = new Dictionary<string, ICommand>();

    // names currently available to the player
    private readonly HashSet<string> unlocked = new HashSet<string>();

    // Captures: 1 = command name, 2 = optional argument inside parentheses.
    private static readonly Regex Syntax =
        new Regex(@"^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\(\s*(.*?)\s*\))?\s*$", RegexOptions.Compiled);

    private void Awake()
    {
        Register(new DeleteCommand());
        Register(new CloneCommand());
        Register(new GravityCommand());
        Register(new FreezeCommand());

        // Everything is unlocked for now; progressive unlocks come with the
        // predecessor-debugger content. The mechanism is already here.
        foreach (var name in commands.Keys)
            unlocked.Add(name);
    }

    /// <summary>Adds a command to the registry (locked until <see cref="Unlock"/> is called).</summary>
    public void Register(ICommand command)
    {
        if (command != null)
            commands[command.CommandName.ToLowerInvariant()] = command;
    }

    /// <summary>Makes a registered command available to the player.</summary>
    public void Unlock(string commandName)
    {
        unlocked.Add(commandName.ToLowerInvariant());
    }

    public bool IsUnlocked(string commandName)
    {
        return unlocked.Contains(commandName.ToLowerInvariant());
    }

    /// <summary>
    /// Attempts to parse <paramref name="input"/>. On success returns true with the
    /// resolved command and its argument. On failure returns false with a player-facing
    /// error message.
    /// </summary>
    public bool TryParse(string input, out ICommand command, out string arg, out string error)
    {
        command = null;
        arg = string.Empty;
        error = null;

        if (string.IsNullOrWhiteSpace(input))
        {
            error = "EMPTY COMMAND";
            return false;
        }

        Match m = Syntax.Match(input);
        if (!m.Success)
        {
            error = "SYNTAX ERROR";
            return false;
        }

        string name = m.Groups[1].Value.ToLowerInvariant();
        arg = m.Groups[2].Success ? m.Groups[2].Value.Trim().Trim('"', '\'') : string.Empty;

        if (!commands.TryGetValue(name, out command))
        {
            error = $"UNKNOWN COMMAND: {name}";
            command = null;
            return false;
        }

        if (!unlocked.Contains(name))
        {
            error = $"ACCESS DENIED: {name} LOCKED";
            command = null;
            return false;
        }

        return true;
    }
}
