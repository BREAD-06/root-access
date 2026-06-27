using System;
using UnityEngine;

/// <summary>
/// Global corruption state for the simulation. Corruption rises when commands are
/// executed and decays slowly over time. Other systems subscribe to its events
/// (they never poll): the HUD reacts, enemies escalate, the world "fights back".
///
/// Threshold events fire once each, in ascending order, the first time corruption
/// crosses 25 / 50 / 75 / 100. They model the escalation beats in the design:
/// HUD flicker -> scanlines -> fake warnings -> the simulation taking over.
/// </summary>
public class CorruptionManager : MonoBehaviour
{
    public static CorruptionManager Instance { get; private set; }

    [Tooltip("How fast corruption bleeds off, in percent per second.")]
    public float decayRate = 2f;

    /// <summary>Current corruption on a 0..100 scale.</summary>
    public float Corruption { get; private set; }

    /// <summary>Raised whenever corruption changes. Payload is the new 0..100 value.</summary>
    public event Action<float> OnCorruptionChanged;

    public event Action OnThreshold25;
    public event Action OnThreshold50;
    public event Action OnThreshold75;
    public event Action OnThreshold100;

    // One-way latches so each threshold event fires only once.
    private readonly bool[] fired = new bool[4];

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private void OnDestroy()
    {
        if (Instance == this)
            Instance = null;
    }

    private void Update()
    {
        if (Corruption <= 0f || decayRate <= 0f)
            return;

        float next = Mathf.Max(0f, Corruption - decayRate * Time.deltaTime);
        if (!Mathf.Approximately(next, Corruption))
        {
            Corruption = next;
            OnCorruptionChanged?.Invoke(Corruption);
        }
    }

    /// <summary>Adds (or, with a negative amount, removes) corruption and re-checks thresholds.</summary>
    public void AddCorruption(float amount)
    {
        SetCorruption(Corruption + amount);
    }

    /// <summary>Sets corruption directly (clamped 0..100), notifies listeners, checks thresholds.</summary>
    public void SetCorruption(float value)
    {
        Corruption = Mathf.Clamp(value, 0f, 100f);
        OnCorruptionChanged?.Invoke(Corruption);
        CheckThresholds();
    }

    private void CheckThresholds()
    {
        if (!fired[0] && Corruption >= 25f) { fired[0] = true; OnThreshold25?.Invoke(); }
        if (!fired[1] && Corruption >= 50f) { fired[1] = true; OnThreshold50?.Invoke(); }
        if (!fired[2] && Corruption >= 75f) { fired[2] = true; OnThreshold75?.Invoke(); }
        if (!fired[3] && Corruption >= 100f) { fired[3] = true; OnThreshold100?.Invoke(); }
    }
}
