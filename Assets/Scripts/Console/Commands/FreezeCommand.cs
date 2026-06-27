using System.Collections;
using UnityEngine;

/// <summary>
/// freeze() — halts all physics on the target for a few seconds, then restores it.
/// Immobilise enemies, stop projectiles, pause hazards. The timed restore runs as a
/// coroutine on the CommandExecutor (commands themselves aren't MonoBehaviours).
/// </summary>
public class FreezeCommand : ICommand
{
    public string CommandName => "freeze";
    public float CorruptionCost => 10f;

    private const float FreezeDuration = 5f;

    public bool CanExecute(GameObject target, string arg)
    {
        return target != null && !target.CompareTag("Player");
    }

    public void Execute(GameObject target, string arg)
    {
        // Enemies are NavMeshAgent-driven, not physics-driven — freeze them via their
        // own state machine instead of bolting on a Rigidbody that would fight the agent.
        var enemy = target.GetComponent<EnemyStateMachine>();
        if (enemy != null)
        {
            enemy.Freeze(FreezeDuration);
            return;
        }

        Rigidbody rb = target.GetComponent<Rigidbody>();
        if (rb == null)
            rb = target.AddComponent<Rigidbody>();

        // Use a runner so the unfreeze can be timed; fall back to a permanent freeze
        // if no executor is around to host the coroutine.
        if (CommandExecutor.Instance != null)
            CommandExecutor.Instance.StartCoroutine(FreezeRoutine(rb));
        else
            rb.constraints = RigidbodyConstraints.FreezeAll;
    }

    private static IEnumerator FreezeRoutine(Rigidbody rb)
    {
        if (rb == null)
            yield break;

        RigidbodyConstraints original = rb.constraints;
        rb.linearVelocity = Vector3.zero;
        rb.angularVelocity = Vector3.zero;
        rb.constraints = RigidbodyConstraints.FreezeAll;

        yield return new WaitForSeconds(FreezeDuration);

        if (rb != null)
            rb.constraints = original;
    }
}
