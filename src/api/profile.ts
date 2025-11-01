import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export type UserProfile = {
    id: string;
    email: string;
    full_name?: string;
    phone?: string | null;
    avatar_url?: string | null;
    nickname?: string | null;
    accent_color?: string | null;
    status_message?: string | null;
    updated_at?: string;
};

/**
 * Get user profile
*/
export async function getUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    // if profile doesn't exist or is not found, we create it
    if (!data) {
        const { full_name, phone, avatar_url, nickname, accent_color, status_message } = user?.user_metadata ?? {};
        return {
            id: user.id,
            email: user.email || '',
            full_name: full_name ?? null,
            phone: phone ?? null,
            avatar_url: avatar_url ?? null,
            nickname: nickname ?? null,
            accent_color: accent_color ?? '#4FFFBF',
            status_message: status_message ?? null,
        };
    }

    return data as UserProfile;
}

type ProfileUpdates = Partial<Pick<UserProfile, 'full_name' | 'phone' | 'nickname' | 'accent_color' | 'status_message'>>;

/**
 * Update user profile 
*/
export async function updateUserProfile(
    updates: ProfileUpdates
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found or not authenticated');

    const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        ...updates,
        updated_at: new Date().toISOString(),
    });

    if (error) throw error;
}

/**
 * Upload profile picture
*/
export async function uploadProfileImage(): Promise<string> {
    // request permission to access the camera roll
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Permission denied to access camera roll');
    }

    // select image
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
    });

    if (result.canceled) {
        throw new Error('No image selected');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found or not authenticated');

    const photo = result.assets[0];
    const ext = photo.uri.split('.').pop() || 'jpg';
    const fileName = `${user.id}/${Date.now()}.${ext}`;

    // convert image in blob
    const response = await fetch(photo.uri);
    const blob = await response.arrayBuffer();

    // upload on supabase storage
    const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
            contentType: `image/${ext}`,
            upsert: true,
        });

    if (error) throw error;

    // get public URL
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path);

    const existingProfile = await getUserProfile();
    if (!existingProfile) throw new Error('Profile not found');

    // update profile with new avatar_url, mantenendo i dati esistenti
    const { error: updateError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: existingProfile.full_name ?? null,
        phone: existingProfile.phone ?? null,
        nickname: existingProfile.nickname ?? null,
        accent_color: existingProfile.accent_color ?? '#4FFFBF',
        status_message: existingProfile.status_message ?? null,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
    });

    if (updateError) throw updateError;

    return publicUrl;
}

/**
 * LOG-OUT
*/
export async function logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}