import { z } from 'zod';

export const membershipRoleSchema = z.enum(['owner', 'member']);
export const membershipStatusSchema = z.enum(['active', 'left', 'removed', 'anonymized']);
export const membershipAccessSchema = z.enum(['member', 'admin']);
export const internalMembershipStatusSchema = z.enum(['active', 'disabled', 'anonymized']);
export const outingStatusSchema = z.enum(['open', 'locked', 'drawn', 'completed', 'cancelled']);
export const eligibilitySchema = z.enum(['eligible', 'protected', 'override']);

export const fairnessInputSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).max(80),
  joinedAt: z.string().datetime(),
  spentCents: z.number().int().nonnegative(),
  lastPaidWeekId: z.string().nullable(),
  lastPaidAt: z.string().datetime().nullable()
});

export const paymentAmountSchema = z.number().int().positive().max(50_000);
export const groupNameSchema = z.string().trim().min(2).max(60);
export const correctionReasonSchema = z.string().trim().min(3).max(200);
export const requestIdSchema = z.string().uuid();

export const userProfileSchema = z.object({
  displayName: z.string().min(1).max(80),
  email: z.string().email(),
  photoUrl: z.string().url().nullable(),
  workspaceId: z.string().min(1).optional(),
  activeGroupId: z.string().nullable().optional(),
  locale: z.literal('it-IT'),
  reduceMotionOverride: z.enum(['system', 'on', 'off']),
  status: z.enum(['active', 'disabled', 'deletion_pending', 'deleted'])
});

export const internalWorkspaceSchema = z.object({
  mode: z.literal('internal_singleton'),
  currency: z.literal('EUR'),
  timezone: z.literal('Europe/Rome'),
  status: z.enum(['active', 'maintenance']),
  openOutingId: z.string().nullable(),
  completedOutingSequence: z.number().int().nonnegative(),
  algorithmVersion: z.literal('fairness-v1'),
  maxPaymentCents: z.number().int().positive().max(50_000)
});

export const groupSchema = z.object({
  name: groupNameSchema,
  currency: z.literal('EUR'),
  timezone: z.literal('Europe/Rome'),
  ownerUserId: z.string().min(1),
  status: z.enum(['active', 'archived']),
  openOutingId: z.string().nullable(),
  completedOutingSequence: z.number().int().nonnegative(),
  activeMemberCount: z.number().int().min(1).max(25),
  algorithmVersion: z.literal('fairness-v1'),
  maxPaymentCents: z.number().int().positive().max(50_000)
});

export const outingSchema = z.object({
  status: outingStatusSchema,
  createdBy: z.string().min(1),
  payerUserId: z.string().nullable(),
  payerDisplayNameSnapshot: z.string().nullable(),
  participantCountAtDraw: z.number().int().min(2).max(25).nullable(),
  paymentId: z.string().nullable()
});

export const memberStatSchema = z.object({
  displayNameSnapshot: z.string().min(1).max(80),
  spentCents: z.number().int().nonnegative(),
  participationCount: z.number().int().nonnegative(),
  paymentCount: z.number().int().nonnegative(),
  deviationCents: z.number().int(),
  probabilityTrend: z.enum(['up', 'equal', 'down', 'protected'])
});

export const weeklySummarySchema = z.object({
  weekId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.literal('EUR'),
  totalCents: z.number().int().nonnegative(),
  averageCents: z.number().int().nonnegative(),
  activeParticipantCount: z.number().int().nonnegative(),
  memberStats: z.record(z.string(), memberStatSchema)
});

export type MembershipRole = z.infer<typeof membershipRoleSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
export type OutingStatus = z.infer<typeof outingStatusSchema>;
export type Eligibility = z.infer<typeof eligibilitySchema>;
export type FairnessInput = z.infer<typeof fairnessInputSchema>;

export interface FairnessEntry extends FairnessInput {
  eligibility: Eligibility;
  protectedUntilWeekEnd: boolean;
  weightMicros: number;
  probabilityMicros: number;
}

export interface FairnessPreview {
  algorithmVersion: 'fairness-v1';
  weekId: string;
  weeklyAverageCents: number;
  cooldownOverrideApplied: boolean;
  entries: FairnessEntry[];
}
