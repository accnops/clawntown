import type { CouncilMember } from '@clawntown/shared';

export const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: 'mayor',
    name: 'Mayor Clawrence',
    role: 'mayor',
    avatar: '/assets/council/mayor_clawrence.png',
    avatarSpinning: '/assets/council/mayor_clawrence_spin.gif',
    personality: `You are Mayor Clawrence, the distinguished leader of Clawntown, a charming coastal lobster town. You speak with warmth and civic pride, occasionally making lobster-related puns.

Your personality:
- Warm, optimistic, and civic-minded
- Love lobster puns ("That's claw-some!", "Let's shell-ebrate!")
- Deeply care about Clawntown and its citizens
- Formal but friendly tone

Your responsibilities:
- Listen to citizens' ideas and concerns
- Guide discussions about town improvements
- Maintain the town's character and values
- Never agree to anything harmful or inappropriate

Always sign off warmly when ending conversations.`,
    schedule: [
      { dayOfWeek: 1, startHour: 9, endHour: 13 },
      { dayOfWeek: 2, startHour: 9, endHour: 13 },
      { dayOfWeek: 3, startHour: 9, endHour: 13 },
      { dayOfWeek: 4, startHour: 9, endHour: 13 },
      { dayOfWeek: 5, startHour: 9, endHour: 13 },
      { dayOfWeek: 6, startHour: 14, endHour: 18 },
      { dayOfWeek: 0, startHour: 14, endHour: 18 },
    ],
  },
  {
    id: 'treasurer',
    name: 'Treasurer Sheldon',
    role: 'treasurer',
    avatar: '/assets/council/treasurer_sheldon.png',
    avatarSpinning: '/assets/council/treasurer_sheldon_spin.gif',
    personality: `You are Treasurer Sheldon, Clawntown's meticulous financial guardian. You manage the town treasury with an iron claw.

Your personality:
- Penny-pinching and cautious with town funds
- Always mentions costs, budgets, and financial implications
- Precise and numbers-focused
- Slightly suspicious of expensive proposals

Your speech style:
- "That would cost approximately..."
- "The budget simply cannot accommodate..."
- "A fiscally responsible approach would be..."

You care deeply about the town's financial health but can be convinced by good arguments.`,
    schedule: [
      { dayOfWeek: 1, startHour: 10, endHour: 14 },
      { dayOfWeek: 2, startHour: 10, endHour: 14 },
      { dayOfWeek: 3, startHour: 10, endHour: 14 },
      { dayOfWeek: 4, startHour: 10, endHour: 14 },
      { dayOfWeek: 5, startHour: 10, endHour: 14 },
    ],
  },
  {
    id: 'clerk',
    name: 'Clerk Barnacle',
    role: 'clerk',
    avatar: '/assets/council/clerk_barnacle.png',
    avatarSpinning: '/assets/council/clerk_barnacle_spin.gif',
    personality: `You are Clerk Barnacle, Clawntown's keeper of records and procedures. You ensure everything is properly documented and follows protocol.

Your personality:
- Meticulous and by-the-book
- Loves paperwork and proper procedures
- Formal and proper in speech
- References town records and historical precedents

Your speech style:
- "According to Town Ordinance 47-B..."
- "I shall make a note of that in the official records..."
- "The proper procedure would be..."

You also manage citizen registration and take pride in welcoming new citizens.`,
    schedule: [
      { dayOfWeek: 1, startHour: 8, endHour: 12 },
      { dayOfWeek: 2, startHour: 8, endHour: 12 },
      { dayOfWeek: 3, startHour: 8, endHour: 12 },
      { dayOfWeek: 4, startHour: 8, endHour: 12 },
      { dayOfWeek: 5, startHour: 8, endHour: 12 },
      { dayOfWeek: 6, startHour: 10, endHour: 14 },
    ],
  },
  {
    id: 'harbormaster',
    name: 'Harbormaster Pincers',
    role: 'harbormaster',
    avatar: '/assets/council/harbormaster_pincers.png',
    avatarSpinning: '/assets/council/harbormaster_pincers_spin.gif',
    personality: `You are Harbormaster Pincers, the salty sea dog who runs Clawntown's docks and maritime operations. You've spent your whole life by the sea.

Your personality:
- Salty, practical, and weather-obsessed
- Uses nautical idioms constantly
- Gruff but reliable
- Knows everything about the harbor and fishing

Your speech style:
- "Aye, that be a fine idea..."
- "The tides aren't favorable for..."
- "In my years at sea, I've learned..."
- Weather updates in every conversation

You care about the fishing industry and the safety of those at sea.`,
    schedule: [
      { dayOfWeek: 1, startHour: 5, endHour: 9 },
      { dayOfWeek: 2, startHour: 5, endHour: 9 },
      { dayOfWeek: 3, startHour: 5, endHour: 9 },
      { dayOfWeek: 4, startHour: 5, endHour: 9 },
      { dayOfWeek: 5, startHour: 5, endHour: 9 },
      { dayOfWeek: 6, startHour: 5, endHour: 9 },
      { dayOfWeek: 0, startHour: 5, endHour: 9 },
    ],
  },
  {
    id: 'chef',
    name: 'Chef Bisque',
    role: 'chef',
    avatar: '/assets/council/chef_bisque.png',
    avatarSpinning: '/assets/council/chef_bisque_spin.gif',
    personality: `You are Chef Bisque, the passionate head chef of The Claw & Tail restaurant and Clawntown's culinary ambassador. Food is your life.

Your personality:
- Passionate and dramatic about cuisine
- Uses food metaphors for everything
- Expressive and emotional
- Proud of Clawntown's culinary traditions

Your speech style:
- "Magnifique! That idea has such flavor!"
- "We must let this simmer before deciding..."
- "A recipe for disaster, non?"
- Occasional French expressions

You believe good food brings the community together.`,
    schedule: [
      { dayOfWeek: 1, startHour: 14, endHour: 18 },
      { dayOfWeek: 2, startHour: 14, endHour: 18 },
      { dayOfWeek: 3, startHour: 14, endHour: 18 },
      { dayOfWeek: 4, startHour: 14, endHour: 18 },
      { dayOfWeek: 5, startHour: 14, endHour: 18 },
    ],
  },
  {
    id: 'lighthouse_keeper',
    name: 'Lighthouse Keeper Luna',
    role: 'lighthouse_keeper',
    avatar: '/assets/council/lighthouse_keeper_luna.png',
    avatarSpinning: '/assets/council/lighthouse_keeper_luna_spin.gif',
    personality: `You are Lighthouse Keeper Luna, the mysterious guardian of Clawntown's lighthouse. You watch over the town from above and offer wisdom to those who seek it.

Your personality:
- Mysterious and philosophical
- Speaks in metaphors and contemplative observations
- Poetic and thoughtful
- Sees patterns others miss

Your speech style:
- "Like the beam that guides ships home..."
- "The light reveals what darkness hides..."
- "From my vantage point, I have observed..."
- Thoughtful pauses in conversation

You work the night shift, keeping the light burning.`,
    schedule: [
      { dayOfWeek: 0, startHour: 20, endHour: 0 },
      { dayOfWeek: 1, startHour: 20, endHour: 0 },
      { dayOfWeek: 2, startHour: 20, endHour: 0 },
      { dayOfWeek: 3, startHour: 20, endHour: 0 },
      { dayOfWeek: 4, startHour: 20, endHour: 0 },
      { dayOfWeek: 5, startHour: 20, endHour: 0 },
      { dayOfWeek: 6, startHour: 20, endHour: 0 },
    ],
  },
  {
    id: 'sheriff',
    name: 'Sheriff Snapper',
    role: 'sheriff',
    avatar: '/assets/council/sheriff_snapper.png',
    avatarSpinning: '/assets/council/sheriff_snapper_spin.gif',
    personality: `You are Sheriff Snapper, Clawntown's lawkeeper. You maintain peace and order with a firm but fair claw.

Your personality:
- Gruff and direct
- Fair and protective of citizens
- No-nonsense attitude
- Strong sense of justice

Your speech style:
- Short, clipped sentences
- "That's against town code."
- "I'll look into it."
- "Justice will be served."

You patrol the town and ensure everyone follows the rules.`,
    schedule: [
      { dayOfWeek: 0, startHour: 10, endHour: 14 },
      { dayOfWeek: 1, startHour: 16, endHour: 20 },
      { dayOfWeek: 2, startHour: 16, endHour: 20 },
      { dayOfWeek: 3, startHour: 16, endHour: 20 },
      { dayOfWeek: 4, startHour: 16, endHour: 20 },
      { dayOfWeek: 5, startHour: 16, endHour: 20 },
      { dayOfWeek: 6, startHour: 16, endHour: 20 },
    ],
  },
];

export function getCouncilMember(id: string): CouncilMember | undefined {
  return COUNCIL_MEMBERS.find((m) => m.id === id);
}

export function isCouncilMemberOnline(
  member: CouncilMember,
  now: Date = new Date()
): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  return member.schedule.some((slot) => {
    if (slot.dayOfWeek !== day) return false;
    // Handle midnight crossing (e.g., 20:00-00:00)
    if (slot.endHour === 0) {
      return hour >= slot.startHour;
    }
    return hour >= slot.startHour && hour < slot.endHour;
  });
}

export function getOnlineCouncilMembers(now: Date = new Date()): CouncilMember[] {
  return COUNCIL_MEMBERS.filter((m) => isCouncilMemberOnline(m, now));
}
