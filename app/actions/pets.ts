"use server";

import { createClient } from "@/lib/supabase/server";

export interface PetState {
    id: string;
    name: string;
    pet_type: string;
    health: number;
    hunger: number;
    happiness: number;
    status: 'happy' | 'hungry' | 'sad' | 'sick';
    last_interacted_at: string;
}

const DECAY_RATE_HOURS = 0.5; // Stats drop every 30 minutes

export async function getUserPet(): Promise<PetState | null> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from("user_pets")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (error || !data) {
            // Create default pet
            const initialPet = {
                user_id: user.id,
                name: 'CashPig',
                pet_type: 'piggy',
                health: 100,
                hunger: 100,
                happiness: 100,
                status: 'happy'
            };

            const { data: newData, error: insertError } = await supabase
                .from("user_pets")
                .insert(initialPet)
                .select()
                .single();

            if (insertError) {
                console.error("Error creating pet:", insertError);
                return null;
            }
            return newData;
        }

        // Calculate decay based on last interaction
        return await updatePetDecay(data);
    } catch (e) {
        console.error("Exception in getUserPet:", e);
        return null;
    }
}

async function updatePetDecay(petData: Partial<PetState> & { id: string; last_interacted_at: string; hunger: number; happiness: number; health: number }): Promise<PetState> {
    const supabase = await createClient();
    const now = new Date();
    const lastInteraction = new Date(petData.last_interacted_at);

    // Calculate hours passed
    const hoursPassed = Math.abs(now.getTime() - lastInteraction.getTime()) / 36e5;

    if (hoursPassed < DECAY_RATE_HOURS) {
        return petData as PetState;
    }

    // Decay logic
    const decaySteps = Math.floor(hoursPassed / DECAY_RATE_HOURS);
    const decayAmount = decaySteps * 5; // -5 per 30 mins

    const newHunger = Math.max(0, petData.hunger - decayAmount);
    const newHappiness = Math.max(0, petData.happiness - Math.floor(decayAmount / 2));
    let newHealth = petData.health;

    if (newHunger === 0) {
        newHealth = Math.max(0, newHealth - (decaySteps * 2));
    }

    let newStatus = 'happy';
    if (newHealth < 50) newStatus = 'sick';
    else if (newHunger < 40) newStatus = 'hungry';
    else if (newHappiness < 50) newStatus = 'sad';

    const { data } = await supabase
        .from("user_pets")
        .update({
            hunger: newHunger,
            happiness: newHappiness,
            health: newHealth,
            status: newStatus
        })
        .eq("id", petData.id)
        .select()
        .single();

    return (data || petData) as PetState;
}

export type PetActionType = 'feed' | 'play' | 'heal' | 'pet' | 'income' | 'save' | 'create_plan' | 'expense_ok' | 'expense_bad' | 'debt' | 'pay_debt' | 'goal_done' | 'streak_7';

export async function interactWithPet(action: PetActionType): Promise<PetState | null> {
    try {
        const supabase = await createClient();
        const pet = await getUserPet();
        if (!pet) return null;

        let { hunger, happiness, health } = pet;

        switch (action) {
            case 'feed':
                hunger = Math.min(100, hunger + 30);
                happiness = Math.min(100, happiness + 5);
                break;
            case 'play':
                happiness = Math.min(100, happiness + 30);
                break;
            case 'pet':
                happiness = Math.min(100, happiness + 12);
                break;
            case 'heal':
                health = Math.min(100, health + 40);
                happiness = Math.max(0, Math.floor(happiness - 10));
                break;
            case 'income':
                hunger = Math.min(100, hunger + 15);
                happiness = Math.min(100, happiness + 10);
                break;
            case 'save':
                health = Math.min(100, health + 25);
                happiness = Math.min(100, happiness + 20);
                break;
            case 'create_plan':
                health = 100;
                break;
            case 'expense_ok':
                // Gasto normal dentro de presupuesto
                hunger = Math.max(0, hunger - 5);
                break;
            case 'expense_bad':
                // Fuera de presupuesto
                health = Math.max(0, health - 20);
                break;
            case 'debt':
                health = Math.max(0, health - 15);
                break;
            case 'pay_debt':
                health = Math.min(100, health + 30);
                break;
            case 'goal_done':
                health = 100;
                happiness = 100;
                break;
            case 'streak_7':
                health = 100; // Energía al 100%
                happiness = 100;
                break;
        }

        let status = 'happy';
        if (health < 50) status = 'sick';
        else if (hunger < 40) status = 'hungry';
        else if (happiness < 50) status = 'sad';

        // Forzar cara mala instantánea en expense_bad si amerita (estético, se pisará rápido si curan)
        if (action === 'expense_bad' && health < 50) status = 'sick';

        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from("user_pets")
            .update({
                hunger,
                happiness,
                health,
                status,
                last_interacted_at: now,
                updated_at: now
            })
            .eq("id", pet.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating pet:", error);
            return null;
        }

        return data as PetState;
    } catch (e) {
        console.error("Exception in interactWithPet:", e);
        return null;
    }
}
