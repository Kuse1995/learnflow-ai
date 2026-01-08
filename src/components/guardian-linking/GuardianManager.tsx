/**
 * Guardian Manager Component
 * 
 * Provides UI for:
 * - Creating and managing guardians
 * - Linking guardians to students
 * - Managing roles and rights
 * - Detecting shared phones and duplicates
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  UserPlus, 
  Link2, 
  Unlink, 
  Shield, 
  Phone, 
  Mail,
  AlertTriangle,
  CheckCircle2,
  Users,
} from "lucide-react";
import {
  useStudentGuardians,
  useCreateGuardian,
  useLinkGuardian,
  useUnlinkGuardian,
  useVerifyLink,
  useFindByPhone,
  type GuardianRecord,
} from "@/hooks/useGuardianLinking";
import { 
  GUARDIAN_ROLES, 
  RELATIONSHIP_LABELS,
  type GuardianRole,
} from "@/lib/guardian-linking";

interface GuardianManagerProps {
  studentId: string;
  studentName: string;
  schoolId: string;
  canManage?: boolean; // Admin only
}

const ROLE_BADGES: Record<GuardianRole, { variant: "default" | "secondary" | "outline"; label: string }> = {
  primary_guardian: { variant: "default", label: "Primary" },
  secondary_guardian: { variant: "secondary", label: "Secondary" },
  informational_contact: { variant: "outline", label: "Info Only" },
};

export function GuardianManager({ 
  studentId, 
  studentName, 
  schoolId,
  canManage = false 
}: GuardianManagerProps) {
  const { data: guardians, isLoading } = useStudentGuardians(studentId);
  const createGuardianMutation = useCreateGuardian();
  const linkMutation = useLinkGuardian();
  const unlinkMutation = useUnlinkGuardian();
  const verifyMutation = useVerifyLink();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  
  // New guardian form state
  const [newGuardian, setNewGuardian] = useState({
    display_name: "",
    primary_phone: "",
    email: "",
    whatsapp_number: "",
  });
  
  // Link form state
  const [linkForm, setLinkForm] = useState({
    guardian_id: "",
    role: "secondary_guardian" as GuardianRole,
    relationship_label: "",
  });

  // Check for existing guardians with same phone
  const { data: existingByPhone } = useFindByPhone(newGuardian.primary_phone, schoolId);

  const handleCreateGuardian = async () => {
    const guardian = await createGuardianMutation.mutateAsync({
      ...newGuardian,
      school_id: schoolId,
    });
    
    // Automatically link to student
    await linkMutation.mutateAsync({
      guardian_id: guardian.id,
      student_id: studentId,
      role: linkForm.role,
      relationship_label: linkForm.relationship_label || undefined,
    });
    
    setShowAddDialog(false);
    setNewGuardian({ display_name: "", primary_phone: "", email: "", whatsapp_number: "" });
    setLinkForm({ guardian_id: "", role: "secondary_guardian", relationship_label: "" });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <span className="text-muted-foreground">Loading guardians...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Guardians
          </div>
          {canManage && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Guardian
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Guardian</DialogTitle>
                  <DialogDescription>
                    Create a new guardian and link to {studentName}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={newGuardian.display_name}
                      onChange={(e) => setNewGuardian(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="Parent/Guardian name"
                    />
                  </div>
                  
                  {/* Phone */}
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={newGuardian.primary_phone}
                      onChange={(e) => setNewGuardian(prev => ({ ...prev, primary_phone: e.target.value }))}
                      placeholder="+263..."
                    />
                    {existingByPhone && existingByPhone.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This phone number is already used by: {existingByPhone.map(g => g.display_name).join(", ")}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <Label>WhatsApp Number</Label>
                    <Input
                      value={newGuardian.whatsapp_number}
                      onChange={(e) => setNewGuardian(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                      placeholder="Same as phone or different"
                    />
                  </div>
                  
                  {/* Email */}
                  <div className="space-y-2">
                    <Label>Email (Optional)</Label>
                    <Input
                      type="email"
                      value={newGuardian.email}
                      onChange={(e) => setNewGuardian(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <Separator />
                  
                  {/* Role */}
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select
                      value={linkForm.role}
                      onValueChange={(v) => setLinkForm(prev => ({ ...prev, role: v as GuardianRole }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(GUARDIAN_ROLES).map((role) => (
                          <SelectItem key={role.role} value={role.role}>
                            <div>
                              <div className="font-medium">{role.label}</div>
                              <div className="text-xs text-muted-foreground">{role.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Relationship */}
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Select
                      value={linkForm.relationship_label}
                      onValueChange={(v) => setLinkForm(prev => ({ ...prev, relationship_label: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIP_LABELS.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateGuardian}
                    disabled={!newGuardian.display_name || createGuardianMutation.isPending}
                  >
                    Add Guardian
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
        <CardDescription>
          {guardians?.length || 0} guardian(s) linked to {studentName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!guardians || guardians.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No guardians linked yet</p>
            {canManage && (
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setShowAddDialog(true)}
              >
                Add the first guardian
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guardian</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Rights</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardians.map((guardian: any) => {
                const roleInfo = ROLE_BADGES[guardian.link?.role as GuardianRole];
                return (
                  <TableRow key={guardian.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{guardian.display_name}</div>
                        {guardian.link?.relationship_label && (
                          <div className="text-xs text-muted-foreground">
                            {guardian.link.relationship_label}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleInfo?.variant || "outline"}>
                        {roleInfo?.label || guardian.link?.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {guardian.primary_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {guardian.primary_phone}
                          </div>
                        )}
                        {guardian.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {guardian.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {guardian.link?.can_pickup && (
                          <Badge variant="outline" className="text-xs">Pickup</Badge>
                        )}
                        {guardian.link?.can_make_decisions && (
                          <Badge variant="outline" className="text-xs">Decisions</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {guardian.link?.verified_at ? (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="w-fit">Unverified</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          {!guardian.link?.verified_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => verifyMutation.mutate({ 
                                linkId: guardian.link.id, 
                                method: "admin_entry" 
                              })}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unlinkMutation.mutate({
                              linkId: guardian.link.id,
                              studentId,
                              guardianId: guardian.id,
                            })}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
