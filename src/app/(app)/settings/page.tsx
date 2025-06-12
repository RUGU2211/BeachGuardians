
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { mockVolunteers, getVolunteerById } from '@/lib/mockData'; 
import { Loader2, Palette, User, Bell } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const currentVolunteerId = mockVolunteers[0]?.id;

const settingsFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email().optional(),
  enableEmailNotifications: z.boolean().default(false),
  theme: z.string().default('light'), 
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // Removed initialTheme state, form will manage theme value

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: { // Synchronous default values
      name: '',
      email: '',
      enableEmailNotifications: false,
      theme: 'light', // Default theme, localStorage will override in useEffect
    },
  });

  // Effect to load user-specific data and persisted theme from localStorage
  useEffect(() => {
    const volunteer = getVolunteerById(currentVolunteerId);
    const lsTheme = localStorage.getItem('theme') || 'light';

    let resetValues: SettingsFormValues = {
      name: '',
      email: '',
      enableEmailNotifications: false, // Default, can be overridden by volunteer data if available
      theme: lsTheme,
    };

    if (volunteer) {
      resetValues.name = volunteer.name || '';
      resetValues.email = volunteer.email || '';
      // If you store notification preferences on the volunteer object, load them here:
      // resetValues.enableEmailNotifications = volunteer.preferences?.emailNotifications ?? false;
    }
    
    form.reset(resetValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to initialize form with potentially persisted data

  const currentTheme = form.watch('theme');

  // Effect to apply theme to document and save to localStorage
  useEffect(() => {
    if (currentTheme) { 
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [currentTheme]); // Re-run only when currentTheme (from form state) changes


  const onSubmit = async (data: SettingsFormValues) => {
    setIsLoading(true);
    console.log("Settings data submitted:", data);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const volunteer = getVolunteerById(currentVolunteerId);
    if (volunteer) {
      volunteer.name = data.name;
      // In a real app, save other settings like data.enableEmailNotifications
    }

    toast({
      title: "Settings Saved!",
      description: "Your preferences have been updated.",
    });
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><User className="mr-2 h-6 w-6 text-primary"/> Profile Information</CardTitle>
          <CardDescription>Manage your personal details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input placeholder="your@email.com" {...field} readOnly className="bg-muted/50 cursor-not-allowed" /></FormControl>
                    <FormDescription>Your email address is not editable here.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card className="mt-8 pt-6">
                <CardHeader className="pt-0">
                  <CardTitle className="font-headline flex items-center"><Palette className="mr-2 h-6 w-6 text-primary"/> Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the application.</CardDescription>
                </CardHeader>
                <CardContent>
                   <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => ( // field.value will be initialized by defaultValues or form.reset
                      <FormItem>
                        <FormLabel>Theme</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value} // Use value, it's controlled by RHF
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Choose your preferred interface theme.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card className="mt-8 pt-6">
                 <CardHeader className="pt-0">
                    <CardTitle className="font-headline flex items-center"><Bell className="mr-2 h-6 w-6 text-primary"/> Notifications</CardTitle>
                    <CardDescription>Manage how you receive updates from BeachGuardians.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="enableEmailNotifications"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                                Receive emails about new events and important updates.
                            </FormDescription>
                            </div>
                            <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                </CardContent>
              </Card>

              <Button type="submit" disabled={isLoading} size="lg" className="mt-8">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
