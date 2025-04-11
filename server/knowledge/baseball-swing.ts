/**
 * Baseball Swing Knowledge Base
 * Contains expert knowledge on proper baseball swing mechanics
 * Used by the AI to provide more accurate and detailed swing analysis
 */

export const baseballSwingGuide = `
# Baseball Swing Fundamentals and Mechanics Guide

## Setup and Stance
- Begin with 100% of weight on back leg, feeling balanced and athletic
- Position hands between neck and deltoid, allowing arm flexion and relaxed feel
- Hold bat in vertical position initially to promote relaxed hands
- Consider a toe tap as a timing mechanism (like Barry Bonds and Ted Williams)
- Keep head still, shoulders should not move until bat is on plane behind you

## Load and Gather
- Maintain flexion in arms and vertical bat when lifting front leg
- At apex of gather, maintain flexion in arms and vertical bat position
- Feel fully loaded into back leg
- Belt buckle should start turning toward pitcher, creating hip coil
- Back pocket should work in direction of pitcher

## Forward Movement and Stride
- Move front leg forward to toe touch rather than aggressively lunging
- Maintain majority of weight on back leg at toe touch
- Avoid shifting too much weight onto front foot too early
- "Avoid the ground" with front foot as long as possible
- Pelvis should slide slightly forward as you stride
- Front foot should get weighted quickly to create ground force for rotation
- Belt line may rise during this phase

## Separation, Coil, and Torque
- Lower body initiates forward movement while upper body resists, creating separation/torque
- During coil, hips rotate toward pitcher while shoulders resist, creating core stretch
- Length develops between back hip/shoulder and front hip/shoulder
- Barrel of bat should work rearward, opposite of any initial hand movement

## Barrel Turn and Swing Plane
- Allow tipping movement of barrel for momentum and centripetal force
- Get bat on plane with pitch early in swing
- Great hitters match swing plane with pitch behind them
- Bat should enter hitting zone from inside, staying in zone longer
- Barrel should get behind ball early (Barry Bonds excelled at staying inside ball)

## Bat Speed and Power Generation
- Use stretch-and-fire mechanism where stored energy from separation releases
- Lower body leads swing, initiating rotation for upper body to follow
- Syncing lower and upper body halves creates whip-like action
- Focus on early bat speed for adjustment to pitch location
- Deep barrel turn allows more time in the way of the pitch

## Balance and Swing Path
- Maintain negative spine angle (slight backward lean) during rotation
- Swing path should be level to pitch trajectory with slight upward tilt
- Keep bat on plane with ball as long as possible
- Avoid over-rotating for power once barrel turn is mastered

## Common Mistakes to Look For
- Lunging forward too early, shifting weight prematurely
- No separation between upper and lower body
- Dropping hands during swing
- Upper body leading instead of lower body
- Casting the barrel away from body
- Pulling off ball with front shoulder
- Excessive head movement disrupting vision
- Rolling over wrists too early
- Poor weight transfer from back to front
- Collapsing back side during swing
`;

export const swingPhaseDefinitions = `
# Detailed Swing Phase Definitions

## Setup (0-10% of swing)
The starting position before any movement. Weight should be balanced with slight bias to back leg, hands relaxed, bat vertical.

## Takeaway/Load (10-25% of swing)
Initial movement where hitter shifts weight to back leg, creating potential energy. Hands may move slightly back, bat remains relatively vertical.

## Stride (25-40% of swing)
Front leg moves forward toward pitcher. Weight remains primarily on back leg. Hands stay back, creating separation.

## Hip Rotation (40-55% of swing)
Lower body begins to rotate toward the pitcher. Hips lead the movement while upper body resists slightly, creating torque.

## Swing Initiation (55-70% of swing)
Hands begin to move forward. Bat head drops into the swing plane. Elbow tucks near body.

## Contact Point (70-85% of swing)
Bat meets ball. Hips have rotated open, front leg is firm, back leg drives. Head stays level and fixed on the ball.

## Follow Through (85-100% of swing)
Post-contact completion of the swing. Weight shifts fully to front leg. Bat continues around body. Back leg rotates, often with heel coming off ground.
`;

export const playerEvaluationCriteria = `
# Player Evaluation Criteria

## For Youth Players (8-12)
- Focus on athletic stance and basic balance
- Proper grip and hand position
- Simple weight transfer from back to front
- Head steady and eyes on impact point
- Age-appropriate bat control and contact skills

## For Teen Players (13-17)
- Hip-shoulder separation development
- More advanced weight transfer mechanics
- Improved bat path through the zone
- Consistent contact with different pitch types
- Balance throughout swing phases

## For Advanced Players (18+)
- Maximize hip-shoulder separation and torque
- Optimized swing plane for different pitch locations
- Advanced timing mechanisms
- Efficient power generation while maintaining bat control
- Adjustability to different pitch types and locations

## Coaching Recommendations By Level
### Youth Level
- Focus on fun and basic fundamentals
- Use shorter, lighter bats for control
- Practice with tee and soft-toss more than live pitching
- Build athletic foundation first

### Teen Level
- Introduce more advanced mechanics gradually
- Begin specific strength training for baseball
- Analyze swing with basic video tools
- Develop mental approach to hitting

### Advanced Level
- Detailed video analysis and feedback
- Situation-specific training
- Advanced metrics (exit velocity, launch angle)
- Individualized approach based on player strengths
`;

export const getKnowledgeBase = () => {
  return {
    baseballSwingGuide,
    swingPhaseDefinitions,
    playerEvaluationCriteria
  };
};