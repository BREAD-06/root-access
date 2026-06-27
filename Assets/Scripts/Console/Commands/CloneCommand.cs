using UnityEngine;

/// <summary>clone() / spawn() — duplicates the target, offset to the side. Decoys, platforms, blockers.</summary>
public class CloneCommand : ICommand
{
    public string CommandName => "clone";
    public float CorruptionCost => 15f;

    public bool CanExecute(GameObject target, string arg)
    {
        return target != null && !target.CompareTag("Player");
    }

    public void Execute(GameObject target, string arg)
    {
        GameObject copy = Object.Instantiate(
            target,
            target.transform.position + Vector3.right * 2f,
            target.transform.rotation);
        copy.name = target.name + "_Clone";
    }
}
