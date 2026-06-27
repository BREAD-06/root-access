using System;
using UnityEngine;

/// <summary>
/// Singleton holding the player's health. Other systems can read <see cref="currentHealth"/>,
/// call <see cref="TakeDamage"/> / <see cref="SetHealth"/>, and subscribe to
/// <see cref="OnHealthChanged"/> to react to changes (UI bars, death handling, etc.).
/// </summary>
public class PlayerHealth : MonoBehaviour
{
    public static PlayerHealth Instance { get; private set; }

    public float maxHealth = 100f;

    public float currentHealth { get; private set; }

    /// <summary>Raised whenever health changes; passes the new current health value.</summary>
    public event Action<float> OnHealthChanged;

    /// <summary>Raised once when health reaches 0. Cleared again when health is restored.</summary>
    public event Action OnDeath;

    public bool IsDead { get; private set; }

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        currentHealth = maxHealth;
    }

    private void OnDestroy()
    {
        if (Instance == this)
            Instance = null;
    }

    /// <summary>Sets health, clamped to [0, maxHealth], and notifies listeners.</summary>
    public void SetHealth(float value)
    {
        currentHealth = Mathf.Clamp(value, 0f, maxHealth);
        OnHealthChanged?.Invoke(currentHealth);

        if (currentHealth <= 0f && !IsDead)
        {
            IsDead = true;
            OnDeath?.Invoke();
        }
        else if (currentHealth > 0f)
        {
            IsDead = false; // restored (e.g. respawn)
        }
    }

    public void TakeDamage(float amount)
    {
        SetHealth(currentHealth - amount);
    }
}
