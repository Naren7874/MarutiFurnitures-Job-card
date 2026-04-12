import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useScheduleDelivery, useDispatchTeam } from '../hooks/useApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { format, parseISO } from 'date-fns';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedJobCardIds: string[];
    onSuccess: () => void;
}

export function ScheduleBatchDeliveryModal({ open, onOpenChange, selectedJobCardIds, onSuccess }: Props) {
    const { data: dispatchRes } = useDispatchTeam() as any;
    const dispatchUsers = Array.isArray(dispatchRes?.data) ? dispatchRes.data : [];
    
    const [selectedUser, setSelectedUser] = useState('');
    const [date, setDate] = useState('');
    const [timeSlot, setTimeSlot] = useState('');
    
    const scheduleMutation = useScheduleDelivery();

    const handleSchedule = () => {
        if (!selectedUser || !date) return;
        
        const userObj = dispatchUsers.find((u: any) => u._id === selectedUser);
        
        scheduleMutation.mutate({
            jobCardIds: selectedJobCardIds,
            scheduledDate: date,
            timeSlot,
            deliveryTeam: userObj ? [{
                user_id: userObj._id,
                name: userObj.name,
                role: 'driver'
            }] : []
        }, {
            onSuccess: () => {
                onSuccess();
                onOpenChange(false);
                setSelectedUser('');
                setDate('');
                setTimeSlot('');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[32px] gap-6 p-8 border-border/40">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Schedule Batch Delivery</DialogTitle>
                    <p className="text-sm text-muted-foreground font-medium">Assign {selectedJobCardIds.length} job cards to a dispatch team member.</p>
                </DialogHeader>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Dispatcher</Label>
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="Choose dispatch person..." />
                            </SelectTrigger>
                            <SelectContent>
                                {dispatchUsers.map((u: any) => (
                                    <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Date</Label>
                            <DatePicker 
                                date={date ? parseISO(date) : undefined} 
                                setDate={(newDate) => setDate(newDate ? format(newDate, 'yyyy-MM-dd') : '')} 
                                className="h-12 w-full rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Time Slot</Label>
                            <Select value={timeSlot} onValueChange={setTimeSlot}>
                                <SelectTrigger className="h-12 rounded-xl">
                                    <SelectValue placeholder="Select Slot" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="morning">Morning (9am–12pm)</SelectItem>
                                    <SelectItem value="afternoon">Afternoon (12pm–4pm)</SelectItem>
                                    <SelectItem value="evening">Evening (4pm–8pm)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl px-6">Cancel</Button>
                    <Button 
                        onClick={handleSchedule} 
                        disabled={!selectedUser || !date || scheduleMutation.isPending}
                        className="rounded-xl px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg"
                    >
                        {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule Trip'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
