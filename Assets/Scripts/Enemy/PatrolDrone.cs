using UnityEngine;

/// <summary>
/// Concrete enemy: patrols a loop of waypoints, then chases/attacks when the player
/// is spotted (handled by the base state machine). Weakness per the GDD: delete()
/// is an instant kill; freeze() stops it cold.
/// </summary>
public class PatrolDrone : EnemyStateMachine
{
    [Header("Patrol")]
    public Transform[] waypoints;

    private int currentWaypoint;

    protected override void HandlePatrol()
    {
        if (agent == null || !agent.isOnNavMesh)
            return;

        agent.speed = patrolSpeed;
        agent.isStopped = false;

        if (waypoints == null || waypoints.Length == 0)
            return;

        // Advance to the next waypoint once we've effectively reached the current one.
        if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance + 0.2f)
            currentWaypoint = (currentWaypoint + 1) % waypoints.Length;

        if (waypoints[currentWaypoint] != null)
            agent.SetDestination(waypoints[currentWaypoint].position);
    }
}
