// Member model - Database operations using Supabase
const { supabase } = require('../config/supabase');

class MemberModel {
    static async getAll() {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('generation')
            .order('birth_date');
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', parseInt(id))
            .single();
        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        return data || null;
    }

    static async search(query) {
        const q = `%${query}%`;
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .or(`name.ilike.${q},birth_place.ilike.${q},note.ilike.${q},occupation.ilike.${q}`)
            .order('generation')
            .order('birth_date');
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async getChildren(parentId) {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('parent_id', parseInt(parentId))
            .order('birth_date');
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async create(data) {
        const insertData = {
            name: data.name,
            gender: data.gender || 1,
            birth_date: data.birthDate || null,
            birth_time: data.birthTime || null,
            death_date: data.deathDate || null,
            death_date_lunar: data.deathDateLunar || null,
            birth_place: data.birthPlace || '',
            death_place: data.deathPlace || '',
            note: data.note || '',
            spouse_id: data.spouseId ? parseInt(data.spouseId) : null,
            parent_id: data.parentId ? parseInt(data.parentId) : null,
            generation: data.generation || 1,
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            occupation: data.occupation || '',
            photo: data.photo || '',
        };

        const { data: newMember, error } = await supabase
            .from('members')
            .insert(insertData)
            .select()
            .single();
        if (error) throw new Error(error.message);

        // Link spouse
        if (data.spouseId) {
            await supabase
                .from('members')
                .update({ spouse_id: newMember.id })
                .eq('id', parseInt(data.spouseId));
        }

        return newMember;
    }

    static async update(id, data) {
        const member = await this.getById(id);
        if (!member) return null;

        // Unlink old spouse if changed
        if (member.spouse_id && member.spouse_id !== (data.spouseId ? parseInt(data.spouseId) : null)) {
            await supabase
                .from('members')
                .update({ spouse_id: null })
                .eq('id', member.spouse_id);
        }

        const updateData = {
            name: data.name || member.name,
            gender: data.gender !== undefined ? data.gender : member.gender,
            birth_date: data.birthDate !== undefined ? data.birthDate : member.birth_date,
            birth_time: data.birthTime !== undefined ? data.birthTime : member.birth_time,
            death_date: data.deathDate !== undefined ? data.deathDate : member.death_date,
            death_date_lunar: data.deathDateLunar !== undefined ? data.deathDateLunar : member.death_date_lunar,
            birth_place: data.birthPlace !== undefined ? data.birthPlace : member.birth_place,
            death_place: data.deathPlace !== undefined ? data.deathPlace : member.death_place,
            note: data.note !== undefined ? data.note : member.note,
            spouse_id: data.spouseId !== undefined ? (data.spouseId ? parseInt(data.spouseId) : null) : member.spouse_id,
            parent_id: data.parentId !== undefined ? (data.parentId ? parseInt(data.parentId) : null) : member.parent_id,
            generation: data.generation || member.generation,
            phone: data.phone !== undefined ? data.phone : member.phone,
            email: data.email !== undefined ? data.email : member.email,
            address: data.address !== undefined ? data.address : member.address,
            occupation: data.occupation !== undefined ? data.occupation : member.occupation,
            photo: data.photo !== undefined ? data.photo : member.photo,
            updated_at: new Date().toISOString(),
        };

        const { data: updated, error } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', parseInt(id))
            .select()
            .single();
        if (error) throw new Error(error.message);

        // Link new spouse
        if (data.spouseId) {
            await supabase
                .from('members')
                .update({ spouse_id: parseInt(id) })
                .eq('id', parseInt(data.spouseId));
        }

        return updated;
    }

    static async delete(id) {
        const member = await this.getById(id);
        if (!member) return false;

        // Unlink spouse
        if (member.spouse_id) {
            await supabase.from('members').update({ spouse_id: null }).eq('id', member.spouse_id);
        }
        // Unlink children
        await supabase.from('members').update({ parent_id: null }).eq('parent_id', parseInt(id));
        // Delete achievements
        await supabase.from('achievements').delete().eq('member_id', parseInt(id));
        // Delete member
        const { error } = await supabase.from('members').delete().eq('id', parseInt(id));
        if (error) throw new Error(error.message);
        return true;
    }

    // Achievements
    static async getAchievements(memberId) {
        const { data, error } = await supabase
            .from('achievements')
            .select('*')
            .eq('member_id', parseInt(memberId))
            .order('start_year', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async addAchievement(data) {
        const { data: ach, error } = await supabase
            .from('achievements')
            .insert({
                member_id: parseInt(data.memberId),
                category: data.category || 'other',
                title: data.title,
                organization: data.organization || '',
                start_year: data.startYear || null,
                end_year: data.endYear || null,
                description: data.description || '',
            })
            .select()
            .single();
        if (error) throw new Error(error.message);
        return ach.id;
    }

    static async deleteAchievement(id) {
        const { error } = await supabase.from('achievements').delete().eq('id', parseInt(id));
        if (error) throw new Error(error.message);
        return true;
    }

    static async getStats() {
        const { count: totalMembers } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true });

        const { data } = await supabase
            .from('members')
            .select('generation')
            .order('generation', { ascending: false })
            .limit(1)
            .single();

        return {
            totalMembers: totalMembers || 0,
            totalGenerations: data?.generation || 0,
        };
    }
}

module.exports = MemberModel;
