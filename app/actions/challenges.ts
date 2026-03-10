"use server";



import { createClient } from "@/lib/supabase/server";


export interface Challenge {
    id: string;
    title: string;
    description: string;
    target_amount: number;
    target_count: number;
    reward_xp: number;
    challenge_type: 'savings_amount' | 'streak_days' | 'transaction_count';
}

export interface UserChallenge {
    id: string;
    challenge_id: string;
    status: 'active' | 'completed';
    progress: number;
    challenge?: Challenge;
}

export async function getActiveChallenges(): Promise<UserChallenge[]> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Fetch user challenges joined with challenges
        const { data, error } = await supabase
            .from("user_challenges")
            .select(`
                id,
                challenge_id,
                status,
                progress,
                challenges:challenge_id (
                    id,
                    title,
                    description,
                    target_amount,
                    target_count,
                    reward_xp,
                    challenge_type
                )
            `)
            .eq("user_id", user.id)
            .eq("status", "active");

        if (error) {
            console.error("Error fetching active challenges:", error);
            return [];
        }

        if (!data || data.length === 0) {
            // Assign some default challenges if none exist
            await assignDefaultChallenges(user.id);
            return await fetchActiveChallengesInternal(user.id);
        }

        return data.map(row => ({
            id: row.id,
            challenge_id: row.challenge_id,
            status: row.status as 'active' | 'completed',
            progress: row.progress,
            challenge: Array.isArray(row.challenges) ? row.challenges[0] : row.challenges as unknown as Challenge
        }));

    } catch (e) {
        console.error("Exception in getActiveChallenges", e);
        return [];
    }
}

async function fetchActiveChallengesInternal(userId: string): Promise<UserChallenge[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("user_challenges")
        .select(`
            id,
            challenge_id,
            status,
            progress,
            challenges:challenge_id (
                id,
                title,
                description,
                target_amount,
                target_count,
                reward_xp,
                challenge_type
            )
        `)
        .eq("user_id", userId)
        .eq("status", "active");

    if (!data) return [];

    return data.map(row => ({
        id: row.id,
        challenge_id: row.challenge_id,
        status: row.status as 'active' | 'completed',
        progress: row.progress,
        challenge: Array.isArray(row.challenges) ? row.challenges[0] : row.challenges as unknown as Challenge
    }));
}

async function assignDefaultChallenges(userId: string) {
    const supabase = await createClient();
    const { data: challenges } = await supabase
        .from("challenges")
        .select("id")
        .eq("is_active", true)
        .limit(3);

    if (challenges && challenges.length > 0) {
        const inserts = challenges.map(c => ({
            user_id: userId,
            challenge_id: c.id,
            status: 'active',
            progress: 0
        }));
        await supabase.from("user_challenges").insert(inserts).select();
    }
}

// Function to call whenever a transaction is made
export async function updateChallengeProgress(amountSaved: number = 0, isConstructive: boolean = true) {
    if (!isConstructive) return; // Only positive actions count

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const activeChallenges = await fetchActiveChallengesInternal(user.id);

        for (const uc of activeChallenges) {
            if (!uc.challenge) continue;

            let newProgress = uc.progress;
            let completed = false;

            if (uc.challenge.challenge_type === 'savings_amount') {
                newProgress += amountSaved;
                if (newProgress >= uc.challenge.target_amount) {
                    newProgress = uc.challenge.target_amount;
                    completed = true;
                }
            } else if (uc.challenge.challenge_type === 'transaction_count') {
                newProgress += 1;
                if (newProgress >= uc.challenge.target_count) {
                    newProgress = uc.challenge.target_count;
                    completed = true;
                }
            } else if (uc.challenge.challenge_type === 'streak_days') {
                // streak is updated in processGamificationAction, we can just sync it
                const { data: gamState } = await supabase.from('user_gamification').select('current_streak').eq('user_id', user.id).single();
                if (gamState && gamState.current_streak) {
                    newProgress = gamState.current_streak;
                    if (newProgress >= uc.challenge.target_count) {
                        newProgress = uc.challenge.target_count;
                        completed = true;
                    }
                }
            }

            const updatePayload: Record<string, unknown> = { progress: newProgress, updated_at: new Date().toISOString() };
            if (completed) {
                updatePayload.status = 'completed';
                updatePayload.completed_at = new Date().toISOString();

                // Grant reward XP
                const { data: gamData } = await supabase.from('user_gamification').select('xp_points').eq('user_id', user.id).single();
                if (gamData) {
                    await supabase.from('user_gamification').update({
                        xp_points: gamData.xp_points + uc.challenge.reward_xp
                    }).eq('user_id', user.id);
                }
            }

            await supabase.from("user_challenges").update(updatePayload).eq("id", uc.id);
        }
    } catch (e) {
        console.error("Error updating challenge progress:", e);
    }
}
