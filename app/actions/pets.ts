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

const DECAY_RATE_HOURS = 4; // Stats drop every 4 hours

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
                name: 'Cerdito',
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
    const decayAmount = Math.floor(hoursPassed / DECAY_RATE_HOURS) * 5; // -5 per DECAY_RATE_HOURS

    const newHunger = Math.max(0, petData.hunger - decayAmount);
    const newHappiness = Math.max(0, petData.happiness - Math.floor(decayAmount / 2));
    let newHealth = petData.health;

    if (newHunger === 0) {
        newHealth = Math.max(0, newHealth - 10);
    }

    let newStatus = 'happy';
    if (newHealth < 50) newStatus = 'sick';
    else if (newHunger < 40) newStatus = 'hungry';
    else if (newHappiness < 50) newStatus = 'sad';

    // Actually, only update decay, don't reset last interaction entirely unless they interact
    // Just update the stats in DB
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

export async function interactWithPet(action: 'feed' | 'play' | 'heal' | 'save_money'): Promise<PetState | null> {
    try {
        const supabase = await createClient();
        const pet = await getUserPet();
        if (!pet) return null;

        let { hunger, happiness, health } = pet;

        if (action === 'feed') {
            hunger = Math.min(100, hunger + 30);
            happiness = Math.min(100, happiness + 5);
        } else if (action === 'play') {
            happiness = Math.min(100, happiness + 30);
            hunger = Math.max(0, hunger - 10);
        } else if (action === 'heal') {
            health = Math.min(100, health + 40);
            happiness = Math.min(100, happiness - 10); // Doesn't like medicine
        } else if (action === 'save_money') {
            // Good habits impact pet positively
            health = Math.min(100, health + 5);
            happiness = Math.min(100, happiness + 15);
            hunger = Math.min(100, hunger + 10);
        }

        let status = 'happy';
        if (health < 50) status = 'sick';
        else if (hunger < 40) status = 'hungry';
        else if (happiness < 50) status = 'sad';

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
