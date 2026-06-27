using UnityEngine;

/// <summary>
/// The single point of truth for running console commands. Parses input, validates
/// the target from the <see cref="TargetingSystem"/>, runs the command, fires VFX,
/// and charges the corruption cost. Invalid, locked, or impossible commands surface
/// a red error in the console instead of throwing.
/// </summary>
[RequireComponent(typeof(CommandParser))]
public class CommandExecutor : MonoBehaviour
{
    public static CommandExecutor Instance { get; private set; }

    [Header("Simulation Resistance")]
    [Tooltip("Below this corruption level commands always succeed. Above it, the " +
             "simulation may reject them — and that chance ramps to maxFailChance at 100%.")]
    [SerializeField] private float resistanceStartsAt = 50f;

    [Tooltip("Chance a command is rejected once corruption reaches 100%.")]
    [Range(0f, 1f)]
    [SerializeField] private float maxFailChance = 0.6f;

    [Tooltip("Corruption added when the simulation rejects a command — fighting it " +
             "destabilises things further (a deliberate death-spiral toward 100%).")]
    [SerializeField] private float rejectionPenalty = 5f;

    // Glitchy denial messages shown when the simulation resists.
    private static readonly string[] DenialMessages =
    {
        "ACCESS DENIED",
        "SIMULATION REJECTED INPUT",
        "ERROR: ANOMALY CONTAINMENT ACTIVE",
        "COMMAND CORRUPTED",
        "PERMISSION REVOKED BY ARCHITECT",
    };

    private CommandParser parser;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        parser = GetComponent<CommandParser>();
        if (parser == null)
            parser = gameObject.AddComponent<CommandParser>();
    }

    private void OnDestroy()
    {
        if (Instance == this)
            Instance = null;
    }

    /// <summary>Runs a typed command string against the currently targeted object.</summary>
    public void Execute(string input)
    {
        if (!parser.TryParse(input, out ICommand cmd, out string arg, out string error))
        {
            RealityConsole.Instance?.ShowError(error ?? "INVALID COMMAND");
            return;
        }

        GameObject target = TargetingSystem.Instance != null ? TargetingSystem.Instance.currentTarget : null;

        if (!cmd.CanExecute(target, arg))
        {
            RealityConsole.Instance?.ShowError(target == null ? "NO TARGET" : "CANNOT EXECUTE");
            return;
        }

        // The world fights back: a valid command can still be rejected once corruption is
        // high, and fighting it pushes corruption up further.
        if (IsRejectedBySimulation())
        {
            RealityConsole.Instance?.ShowError(DenialMessages[Random.Range(0, DenialMessages.Length)]);
            CorruptionManager.Instance?.AddCorruption(rejectionPenalty);
            return;
        }

        cmd.Execute(target, arg);
        VFXManager.Instance?.PlayCommandVFX(cmd.CommandName, target);
        CorruptionManager.Instance?.AddCorruption(cmd.CorruptionCost);
    }

    // Rolls the simulation-resistance chance against the current corruption level.
    private bool IsRejectedBySimulation()
    {
        if (CorruptionManager.Instance == null)
            return false;

        float corruption = CorruptionManager.Instance.Corruption;
        if (corruption <= resistanceStartsAt)
            return false;

        float t = Mathf.InverseLerp(resistanceStartsAt, 100f, corruption);
        float failChance = t * maxFailChance;
        return Random.value < failChance;
    }
}
