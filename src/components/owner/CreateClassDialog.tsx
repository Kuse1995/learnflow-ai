import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateClass, useAllSchoolsWithPlans } from '@/hooks/useOwnerControls';

export function CreateClassDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [subject, setSubject] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  const createClass = useCreateClass();
  const { data: schools } = useAllSchoolsWithPlans();

  const handleSubmit = () => {
    if (!name.trim() || !schoolId) return;

    createClass.mutate(
      {
        name: name.trim(),
        schoolId,
        grade: grade || undefined,
        section: section || undefined,
        subject: subject || undefined,
        isDemo,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setSchoolId('');
          setGrade('');
          setSection('');
          setSubject('');
          setIsDemo(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Class
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>
            Add a new class to a school.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Class Name *</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Grade 5A"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="school">School *</Label>
            <Select value={schoolId} onValueChange={setSchoolId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a school" />
              </SelectTrigger>
              <SelectContent>
                {schools?.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g., A"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-demo-class">Demo Class</Label>
            <Switch id="is-demo-class" checked={isDemo} onCheckedChange={setIsDemo} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !schoolId || createClass.isPending}
          >
            {createClass.isPending ? 'Creating...' : 'Create Class'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
