using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// Third-person player controller using Unity's new Input System and a Rigidbody.
/// Handles camera-relative WASD movement, running, jumping (ground-checked via
/// Physics.CheckSphere), and mouse look split between the body (yaw) and a child
/// camera pivot (pitch).
/// </summary>
[RequireComponent(typeof(Rigidbody))]
public class PlayerController : MonoBehaviour
{
    [Header("Movement")]
    public float moveSpeed = 5f;
    public float runSpeed = 10f;
    public float jumpForce = 7f;

    [Header("Look")]
    public float mouseSensitivity = 2f;

    [Header("Ground Check")]
    [Tooltip("Empty child transform placed at the player's feet.")]
    public Transform groundCheck;
    public float groundCheckRadius = 0.2f;
    [Tooltip("Layers considered 'ground' for the jump check.")]
    public LayerMask groundLayers = ~0;

    [Header("References")]
    [Tooltip("Child transform that holds the camera; tilted for vertical look.")]
    public Transform cameraPivot;

    private Rigidbody rb;
    private float pitch;           // accumulated vertical look angle
    private bool isGrounded;
    private bool jumpRequested;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        // Keep the capsule upright; we rotate the body manually via mouse look.
        rb.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
    }

    private void Start()
    {
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    private void Update()
    {
        HandleLook();
        HandleJumpInput();
        HandleConsoleToggle();
    }

    private void FixedUpdate()
    {
        HandleGroundCheck();
        HandleMovement();
        HandleJump();
    }

    private void HandleLook()
    {
        if (Mouse.current == null)
            return;

        Vector2 mouseDelta = Mouse.current.delta.ReadValue() * mouseSensitivity * Time.deltaTime;

        // Horizontal mouse rotates the body around Y.
        transform.Rotate(Vector3.up, mouseDelta.x);

        // Vertical mouse tilts the camera pivot around X, clamped.
        if (cameraPivot != null)
        {
            pitch -= mouseDelta.y;
            pitch = Mathf.Clamp(pitch, -80f, 80f);
            cameraPivot.localRotation = Quaternion.Euler(pitch, 0f, 0f);
        }
    }

    private void HandleJumpInput()
    {
        if (Keyboard.current != null && Keyboard.current.spaceKey.wasPressedThisFrame)
            jumpRequested = true;
    }

    private void HandleConsoleToggle()
    {
        if (Keyboard.current != null && Keyboard.current.qKey.wasPressedThisFrame)
        {
            // RealityConsole may not exist yet; guard so this compiles and runs safely.
            if (RealityConsole.Instance != null)
                RealityConsole.Instance.Toggle();
        }
    }

    private void HandleGroundCheck()
    {
        if (groundCheck != null)
            isGrounded = Physics.CheckSphere(groundCheck.position, groundCheckRadius, groundLayers, QueryTriggerInteraction.Ignore);
        else
            isGrounded = false;
    }

    private void HandleMovement()
    {
        Vector2 input = Vector2.zero;
        if (Keyboard.current != null)
        {
            if (Keyboard.current.wKey.isPressed) input.y += 1f;
            if (Keyboard.current.sKey.isPressed) input.y -= 1f;
            if (Keyboard.current.dKey.isPressed) input.x += 1f;
            if (Keyboard.current.aKey.isPressed) input.x -= 1f;
        }

        bool isRunning = Keyboard.current != null && Keyboard.current.leftShiftKey.isPressed;
        float speed = isRunning ? runSpeed : moveSpeed;

        // Movement is relative to where the body is facing (which tracks the camera yaw).
        Vector3 forward = transform.forward;
        Vector3 right = transform.right;
        forward.y = 0f;
        right.y = 0f;
        forward.Normalize();
        right.Normalize();

        Vector3 desired = (forward * input.y + right * input.x);
        if (desired.sqrMagnitude > 1f)
            desired.Normalize();

        Vector3 targetVelocity = desired * speed;
        // Preserve vertical velocity (gravity / jump), drive horizontal velocity.
        Vector3 velocity = rb.linearVelocity;
        velocity.x = targetVelocity.x;
        velocity.z = targetVelocity.z;
        rb.linearVelocity = velocity;
    }

    private void HandleJump()
    {
        if (jumpRequested)
        {
            jumpRequested = false;
            if (isGrounded)
            {
                Vector3 velocity = rb.linearVelocity;
                velocity.y = 0f;            // reset vertical so jump height is consistent
                rb.linearVelocity = velocity;
                rb.AddForce(Vector3.up * jumpForce, ForceMode.Impulse);
            }
        }
    }

    private void OnDrawGizmosSelected()
    {
        if (groundCheck != null)
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(groundCheck.position, groundCheckRadius);
        }
    }
}
