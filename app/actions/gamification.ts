"use server";

import { createClient } from "@/lib/supabase/server";

export interface GamificationState {
    xp_points: number;
    current_level: number;
    current_streak: number;
    highest_streak: number;
    last_action_date: string | null;
}

const XP_PER_LEVEL = 100;

export async function getUserGamification(): Promise<GamificationState | null> {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from("user_gamification")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (error || !data) {
            // Create initial if not exists
            const { data: newData, error: insertError } = await supabase
                .from("user_gamification")
                .insert({ user_id: user.id })
                .select()
                .single();

            if (insertError || !newData) {
                console.error("Supabase user_gamification table missing or insert failed:", insertError);
                return null;
            }
            return newData;
        }

        return data;
    } catch (error) {
        console.error("Unhandled exception in getUserGamification:", error);
        return null;
    }
}

export async function processGamificationAction(actionType: 'transaction' | 'goal_reached' | 'login') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let xpReward = 0;
    switch (actionType) {
        case 'transaction': xpReward = 20; break;
        case 'goal_reached': xpReward = 100; break;
        case 'login': xpReward = 5; break;
    }

    const state = await getUserGamification();
    if (!state) return null;

    let { xp_points, current_level, current_streak, highest_streak } = state;
    const { last_action_date } = state;

    // Check Streak
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let isNewDay = true;
    let brokeStreak = false;

    if (last_action_date) {
        const lastAction = new Date(last_action_date);
        const lastActionStr = lastAction.toISOString().split('T')[0];

        if (lastActionStr === todayStr) {
            isNewDay = false; // Already did something today
        } else {
            // Check if it was exactly yesterday
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastActionStr === yesterdayStr) {
                current_streak += 1;
                xpReward += 10; // Bonus for extending streak
            } else {
                brokeStreak = true;
                current_streak = 1;
            }
        }
    } else {
        current_streak = 1; // First action ever
    }

    if (current_streak > highest_streak) {
        highest_streak = current_streak;
    }

    // Add XP
    xp_points += xpReward;

    // Check level up
    let leveledUp = false;
    const newLevel = Math.floor(xp_points / XP_PER_LEVEL) + 1;
    if (newLevel > current_level) {
        current_level = newLevel;
        leveledUp = true;
    }

    const updateData = {
        xp_points,
        current_level,
        current_streak,
        highest_streak,
        last_action_date: now.toISOString(),
        updated_at: now.toISOString()
    };

    const { error } = await supabase
        .from("user_gamification")
        .update(updateData)
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to update gamification", error);
        return null;
    }

    return { ...updateData, leveledUp, xpReward, isNewDay, brokeStreak };
}
