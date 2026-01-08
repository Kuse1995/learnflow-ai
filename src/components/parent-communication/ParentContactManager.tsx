import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Phone, Mail, Edit, CheckCircle } from "lucide-react";
import {
  useParentContacts,
  useCreateParentContact,
  useUpdateParentContact,
  getAvailableChannel,
  type ParentContact,
} from "@/hooks/useParentCommunication";

interface ParentContactManagerProps {
  studentId: string;
  studentName: string;
}

const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Grandmother", "Grandfather", "Aunt", "Uncle", "Other"];

export function ParentContactManager({ studentId, studentName }: ParentContactManagerProps) {
  const { data: contacts, isLoading } = useParentContacts(studentId);
  const createContact = useCreateParentContact();
  const updateContact = useUpdateParentContact();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ParentContact | null>(null);

  const [formData, setFormData] = useState({
    parent_name: "",
    relationship: "",
    whatsapp_number: "",
    sms_number: "",
    email: "",
    receives_learning_updates: true,
    receives_attendance_notices: true,
    receives_fee_updates: false,
    receives_announcements: true,
    receives_emergency: true,
  });

  const resetForm = () => {
    setFormData({
      parent_name: "",
      relationship: "",
      whatsapp_number: "",
      sms_number: "",
      email: "",
      receives_learning_updates: true,
      receives_attendance_notices: true,
      receives_fee_updates: false,
      receives_announcements: true,
      receives_emergency: true,
    });
  };

  const handleAdd = () => {
    createContact.mutate(
      {
        student_id: studentId,
        parent_name: formData.parent_name,
        relationship: formData.relationship || null,
        whatsapp_number: formData.whatsapp_number || null,
        sms_number: formData.sms_number || null,
        email: formData.email || null,
        preferred_language: "en",
        receives_learning_updates: formData.receives_learning_updates,
        receives_attendance_notices: formData.receives_attendance_notices,
        receives_fee_updates: formData.receives_fee_updates,
        receives_announcements: formData.receives_announcements,
        receives_emergency: formData.receives_emergency,
        last_successful_contact_at: null,
      },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editingContact) return;
    updateContact.mutate(
      {
        id: editingContact.id,
        parent_name: formData.parent_name,
        relationship: formData.relationship || null,
        whatsapp_number: formData.whatsapp_number || null,
        sms_number: formData.sms_number || null,
        email: formData.email || null,
        receives_learning_updates: formData.receives_learning_updates,
        receives_attendance_notices: formData.receives_attendance_notices,
        receives_fee_updates: formData.receives_fee_updates,
        receives_announcements: formData.receives_announcements,
        receives_emergency: formData.receives_emergency,
      },
      {
        onSuccess: () => {
          setEditingContact(null);
          resetForm();
        },
      }
    );
  };

  const openEdit = (contact: ParentContact) => {
    setEditingContact(contact);
    setFormData({
      parent_name: contact.parent_name,
      relationship: contact.relationship || "",
      whatsapp_number: contact.whatsapp_number || "",
      sms_number: contact.sms_number || "",
      email: contact.email || "",
      receives_learning_updates: contact.receives_learning_updates ?? true,
      receives_attendance_notices: contact.receives_attendance_notices ?? true,
      receives_fee_updates: contact.receives_fee_updates ?? false,
      receives_announcements: contact.receives_announcements ?? true,
      receives_emergency: contact.receives_emergency ?? true,
    });
  };

  const ContactForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Parent/Guardian Name</Label>
          <Input
            value={formData.parent_name}
            onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-2">
          <Label>Relationship</Label>
          <Select
            value={formData.relationship}
            onValueChange={(v) => setFormData({ ...formData, relationship: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((r) => (
                <SelectItem key={r} value={r.toLowerCase()}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>WhatsApp Number (Primary)</Label>
        <Input
          value={formData.whatsapp_number}
          onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
          placeholder="+260..."
        />
      </div>

      <div className="space-y-2">
        <Label>SMS Number (Secondary)</Label>
        <Input
          value={formData.sms_number}
          onChange={(e) => setFormData({ ...formData, sms_number: e.target.value })}
          placeholder="+260..."
        />
      </div>

      <div className="space-y-2">
        <Label>Email (Optional)</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="email@example.com"
        />
      </div>

      <div className="border-t pt-4 space-y-3">
        <p className="text-sm font-medium">Message Preferences</p>
        
        <div className="flex items-center justify-between">
          <Label className="font-normal">Learning Updates</Label>
          <Switch
            checked={formData.receives_learning_updates}
            onCheckedChange={(c) => setFormData({ ...formData, receives_learning_updates: c })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="font-normal">Attendance Notices</Label>
          <Switch
            checked={formData.receives_attendance_notices}
            onCheckedChange={(c) => setFormData({ ...formData, receives_attendance_notices: c })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="font-normal">Account Information (Opt-in)</Label>
          <Switch
            checked={formData.receives_fee_updates}
            onCheckedChange={(c) => setFormData({ ...formData, receives_fee_updates: c })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="font-normal">School Announcements</Label>
          <Switch
            checked={formData.receives_announcements}
            onCheckedChange={(c) => setFormData({ ...formData, receives_announcements: c })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="font-normal">Important Notices</Label>
          <Switch
            checked={formData.receives_emergency}
            onCheckedChange={(c) => setFormData({ ...formData, receives_emergency: c })}
          />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Parent Contacts
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Parent Contacts for {studentName}
            </CardTitle>
            <CardDescription>
              Manage parent/guardian contact information and preferences
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Parent Contact</DialogTitle>
                <DialogDescription>
                  Add a parent or guardian contact for {studentName}
                </DialogDescription>
              </DialogHeader>
              <ContactForm isEdit={false} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!formData.parent_name.trim() || createContact.isPending}
                >
                  Add Contact
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {contacts && contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((contact) => {
                const channel = getAvailableChannel(contact);
                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{contact.parent_name}</span>
                        {contact.relationship && (
                          <Badge variant="outline" className="font-normal capitalize">
                            {contact.relationship}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {contact.whatsapp_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            WhatsApp: {contact.whatsapp_number}
                          </span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {channel ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Primary: {channel}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-normal text-amber-600">
                            No contact channel
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No parent contacts added yet</p>
              <p className="text-sm">Add a parent or guardian to enable communication</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information and preferences
            </DialogDescription>
          </DialogHeader>
          <ContactForm isEdit={true} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.parent_name.trim() || updateContact.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
