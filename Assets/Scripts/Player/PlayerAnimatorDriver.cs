using UnityEngine;

/// <summary>
/// Drives the player character's Animator from the Rigidbody's movement. Reads
/// horizontal speed each frame and feeds it to a locomotion blend tree, fires a Jump
/// trigger when the player leaves the ground, and a Death trigger when health hits 0.
///
/// Expects an Animator (on the character model, usually a child) with parameters:
///   float  "Speed"    (0 = idle, ~0.5 = walk, 1 = run)
///   bool   "Grounded"
///   trigger "Jump"
///   trigger "Death"
/// </summary>
public class PlayerAnimatorDriver : MonoBehaviour
{
    [Tooltip("Animator on the character model. Auto-found in children if left empty.")]
    [SerializeField] private Animator animator;

    [Tooltip("Speed (m/s) treated as full-run (maps to Speed = 1). Match PlayerController.runSpeed.")]
    [SerializeField] private float runSpeed = 10f;

    [Tooltip("Optional foot transform for the grounded check; falls back to a downward ray.")]
    [SerializeField] private Transform groundCheck;
    [SerializeField] private float groundCheckRadius = 0.25f;
    [SerializeField] private LayerMask groundLayers = ~0;

    [SerializeField] private float speedDamp = 0.12f;

    private Rigidbody rb;
    private bool wasGrounded = true;
    private bool dead;

    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int GroundedHash = Animator.StringToHash("Grounded");
    private static readonly int JumpHash = Animator.StringToHash("Jump");
    private static readonly int DeathHash = Animator.StringToHash("Death");

    private void Awake()
    {
        rb = GetComponentInParent<Rigidbody>();
        if (animator == null) animator = GetComponentInChildren<Animator>();
    }

    private void Start()
    {
        if (PlayerHealth.Instance != null)
            PlayerHealth.Instance.OnDeath += HandleDeath;
    }

    private void OnDestroy()
    {
        if (PlayerHealth.Instance != null)
            PlayerHealth.Instance.OnDeath -= HandleDeath;
    }

    private void Update()
    {
        if (animator == null || rb == null || dead)
            return;

        Vector3 v = rb.linearVelocity;
        v.y = 0f;
        float normalized = Mathf.Clamp01(v.magnitude / Mathf.Max(0.01f, runSpeed));
        animator.SetFloat(SpeedHash, normalized, speedDamp, Time.deltaTime);

        bool grounded = IsGrounded();
        animator.SetBool(GroundedHash, grounded);
        if (wasGrounded && !grounded)
            animator.SetTrigger(JumpHash);
        wasGrounded = grounded;
    }

    private bool IsGrounded()
    {
        if (groundCheck != null)
            return Physics.CheckSphere(groundCheck.position, groundCheckRadius, groundLayers, QueryTriggerInteraction.Ignore);
        return Physics.Raycast(transform.position + Vector3.up * 0.1f, Vector3.down, 0.3f, groundLayers, QueryTriggerInteraction.Ignore);
    }

    private void HandleDeath()
    {
        dead = true;
        if (animator != null)
        {
            animator.SetFloat(SpeedHash, 0f);
            animator.SetTrigger(DeathHash);
        }
    }
}
