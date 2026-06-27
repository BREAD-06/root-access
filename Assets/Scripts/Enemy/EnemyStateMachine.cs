using System.Collections;
using UnityEngine;
using UnityEngine.AI;

public enum EnemyState { Idle, Patrol, Chase, Attack, Dead }

/// <summary>
/// Base AI for simulation enemies. A NavMeshAgent-driven state machine that patrols,
/// chases the player on sight, and attacks in range. It reacts to the corruption
/// system (speeds up once the world starts "fighting back" at 75%) and can be frozen
/// by the freeze() command. delete() simply destroys the GameObject — instant kill.
/// </summary>
[RequireComponent(typeof(NavMeshAgent))]
public class EnemyStateMachine : MonoBehaviour
{
    [Header("Ranges")]
    public float sightRange = 15f;
    public float attackRange = 2.5f;

    [Header("Speeds")]
    public float patrolSpeed = 3.5f;
    public float chaseSpeed = 6f;

    [Header("Combat")]
    public float attackDamage = 10f;
    public float attackInterval = 1f;

    [Tooltip("Speed multiplier applied once corruption passes 75% (the world fights back).")]
    public float corruptionSpeedBoost = 1.5f;

    public EnemyState currentState { get; protected set; } = EnemyState.Patrol;
    public bool IsFrozen { get; private set; }

    protected NavMeshAgent agent;
    protected Transform player;
    protected Animator animator;
    private float lastAttackTime;
    private bool boosted;

    protected virtual void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        animator = GetComponentInChildren<Animator>();
    }

    protected virtual void OnEnable()
    {
        if (CorruptionManager.Instance != null)
            CorruptionManager.Instance.OnThreshold75 += OnHighCorruption;
    }

    protected virtual void OnDisable()
    {
        if (CorruptionManager.Instance != null)
            CorruptionManager.Instance.OnThreshold75 -= OnHighCorruption;
    }

    protected virtual void Start()
    {
        var pc = FindFirstObjectByType<PlayerController>();
        if (pc != null)
            player = pc.transform;
    }

    protected virtual void Update()
    {
        if (currentState == EnemyState.Dead || IsFrozen)
            return;

        if (animator != null) {
            animator.SetFloat("Speed", agent.velocity.magnitude);
        }

        float dist = player != null ? Vector3.Distance(transform.position, player.position) : Mathf.Infinity;

        if (dist <= attackRange) currentState = EnemyState.Attack;
        else if (dist <= sightRange) currentState = EnemyState.Chase;
        else currentState = EnemyState.Patrol;

        switch (currentState)
        {
            case EnemyState.Patrol: HandlePatrol(); break;
            case EnemyState.Chase:  HandleChase();  break;
            case EnemyState.Attack: HandleAttack(); break;
        }
    }

    // Patrol behaviour is enemy-specific; the base does nothing.
    protected virtual void HandlePatrol() { }

    protected virtual void HandleChase()
    {
        if (agent == null || !agent.isOnNavMesh || player == null)
            return;

        agent.speed = chaseSpeed;
        agent.isStopped = false;
        agent.SetDestination(player.position);
    }

    protected virtual void HandleAttack()
    {
        if (agent != null && agent.isOnNavMesh)
            agent.isStopped = true;

        // Turn to face the player.
        if (player != null)
        {
            Vector3 dir = player.position - transform.position;
            dir.y = 0f;
            if (dir.sqrMagnitude > 0.001f)
                transform.rotation = Quaternion.Slerp(
                    transform.rotation, Quaternion.LookRotation(dir), 10f * Time.deltaTime);
        }

        if (Time.time - lastAttackTime >= attackInterval)
        {
            lastAttackTime = Time.time;
            if (PlayerHealth.Instance != null)
                PlayerHealth.Instance.TakeDamage(attackDamage);
            if (animator != null)
                animator.SetTrigger("Attack");
        }
    }

    /// <summary>Immobilises the enemy for <paramref name="duration"/> seconds (freeze() command).</summary>
    public void Freeze(float duration)
    {
        if (currentState != EnemyState.Dead)
            StartCoroutine(FreezeRoutine(duration));
    }

    private IEnumerator FreezeRoutine(float duration)
    {
        IsFrozen = true;
        if (agent != null && agent.isOnNavMesh)
            agent.isStopped = true;

        yield return new WaitForSeconds(duration);

        IsFrozen = false;
        if (agent != null && agent.isOnNavMesh && currentState != EnemyState.Dead)
            agent.isStopped = false;
    }

    private void OnHighCorruption()
    {
        if (boosted) return;
        boosted = true;
        patrolSpeed *= corruptionSpeedBoost;
        chaseSpeed *= corruptionSpeedBoost;
    }
}
