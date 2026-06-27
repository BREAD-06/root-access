using UnityEngine;

/// <summary>
/// gravity() — inverts/lifts the target. Optional argument gravity(x) scales the
/// upward kick (default 1). Throw enemies, float platforms, reach rooftops.
/// Adds a Rigidbody if the target doesn't have one so any object can be affected.
/// </summary>
public class GravityCommand : ICommand
{
    public string CommandName => "gravity";
    public float CorruptionCost => 25f;

    public bool CanExecute(GameObject target, string arg)
    {
        return target != null && !target.CompareTag("Player");
    }

    public void Execute(GameObject target, string arg)
    {
        Rigidbody rb = target.GetComponent<Rigidbody>();
        if (rb == null)
            rb = target.AddComponent<Rigidbody>();

        // Optional numeric argument scales the launch force.
        float scale = 1f;
        if (!string.IsNullOrEmpty(arg) && float.TryParse(arg, out float parsed))
            scale = parsed;

        rb.useGravity = !rb.useGravity;
        rb.AddForce(Vector3.up * 10f * Mathf.Max(0.1f, scale), ForceMode.Impulse);
    }
}
