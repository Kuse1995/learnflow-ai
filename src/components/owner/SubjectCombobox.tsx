import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSchoolSubjects, useCreateSubject } from '@/hooks/useOwnerControls';

interface SubjectComboboxProps {
  schoolId: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function SubjectCombobox({ schoolId, value, onValueChange, disabled }: SubjectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const { data: subjects, isLoading } = useSchoolSubjects(schoolId);
  const createSubject = useCreateSubject();

  const handleAddNewSubject = async () => {
    if (!inputValue.trim() || !schoolId) return;
    
    createSubject.mutate(
      { schoolId, name: inputValue.trim() },
      {
        onSuccess: () => {
          onValueChange(inputValue.trim());
          setInputValue('');
          setOpen(false);
        },
      }
    );
  };

  const matchingSubject = subjects?.find(s => s.name === value);
  const showAddOption = inputValue.trim() && 
    !subjects?.some(s => s.name.toLowerCase() === inputValue.toLowerCase());

  if (!schoolId) {
    return (
      <Button
        variant="outline"
        role="combobox"
        disabled
        className="w-full justify-between"
      >
        Select a school first
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {value || 'Select subject...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search or add subject..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue.trim() ? (
                <div className="py-2 px-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    No subject found.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleAddNewSubject}
                    disabled={createSubject.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add "{inputValue.trim()}"
                  </Button>
                </div>
              ) : (
                'No subjects found.'
              )}
            </CommandEmpty>
            <CommandGroup heading="Subjects">
              {subjects?.map((subject) => (
                <CommandItem
                  key={subject.id}
                  value={subject.name}
                  onSelect={() => {
                    onValueChange(subject.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === subject.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{subject.name}</span>
                  {subject.category && (
                    <span className="ml-auto text-xs text-muted-foreground capitalize">
                      {subject.category}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {showAddOption && subjects && subjects.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleAddNewSubject}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add "{inputValue.trim()}" as new subject
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
