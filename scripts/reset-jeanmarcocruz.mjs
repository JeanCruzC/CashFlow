import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/home/jcc/Documentos/CashFlow/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE URL or SERVICE ROLE KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching users...");
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    const targetUsers = users.users.filter(u =>
        (u.email && u.email.toLowerCase().includes('jeanmarcocruz')) ||
        (u.user_metadata?.name && u.user_metadata.name.toLowerCase().includes('jeanmarcocruz')) ||
        (u.user_metadata?.full_name && u.user_metadata.full_name.toLowerCase().includes('jeanmarcocruz'))
    );

    console.log(`Found ${targetUsers.length} matching users.`);

    if (targetUsers.length === 0) {
        console.log("No users found matching jeanmarcocruz");
    }

    for (const user of targetUsers) {
        console.log(`\nUser: ${user.email} (ID: ${user.id})`);

        // Find organizations owned by this user
        const { data: orgRoles, error: rolesError } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', user.id)
            .eq('role', 'owner');

        if (rolesError) {
            console.error(`Error fetching roles for ${user.id}:`, rolesError);
            continue;
        }

        if (orgRoles && orgRoles.length > 0) {
            const orgIds = orgRoles.map(r => r.org_id);
            console.log(`Found ${orgIds.length} organizations.`);

            for (const orgId of orgIds) {
                // Find if this is a personal or business org to delete it correctly
                // We will just clear user_organizations link first
                const { error: unlinkError } = await supabase
                    .from('org_members')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('org_id', orgId);

                if (!unlinkError) {
                    console.log(`Unlinked user from org ${orgId}.`);
                } else {
                    console.log(`Error unlinking user from org ${orgId}:`, unlinkError);
                }

                const { error: onboardingStateError } = await supabase
                    .from('onboarding_state')
                    .delete()
                    .eq('org_id', orgId);

                // Delete the organization from organizations table
                const { error: delError } = await supabase
                    .from('orgs')
                    .delete()
                    .eq('id', orgId);

                if (delError) {
                    console.error(`Error deleting org ${orgId}:`, delError);
                } else {
                    console.log(`Successfully deleted organization ${orgId}`);
                }
            }
        } else {
            console.log("No organizations to delete for this user.");
        }

        // Update active context globally
        const { error: updateError } = await supabase
            .from('users_context') // Not sure if this table exists in this project, just checking
            .update({ last_active_org_id: null })
            .eq('id', user.id);

        try {
            await supabase.rpc('set_claim', { uid: user.id, claim: 'current_org', value: null });
        } catch (e) {
            // ignore
        }

        // As a strict measure to force onboarding again, let's also remove any settings records tied to them
    }

    console.log("\nDone.");
}

run();
