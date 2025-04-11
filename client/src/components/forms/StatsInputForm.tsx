import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { statsSchema, SwingStats } from "@shared/schema";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

interface StatsInputFormProps {
  onSubmit: (data: SwingStats) => void;
}

export default function StatsInputForm({ onSubmit }: StatsInputFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<SwingStats>({
    resolver: zodResolver(statsSchema),
    defaultValues: {
      batSpeed: undefined,
      exitVelocity: undefined,
      launchAngle: undefined,
      attackAngle: undefined,
      timeToContact: undefined,
      pitchType: "Fastball",
      additionalContext: "",
    },
  });
  
  const handleSubmit = async (data: SwingStats) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const clearForm = () => {
    form.reset({
      batSpeed: undefined,
      exitVelocity: undefined,
      launchAngle: undefined,
      attackAngle: undefined,
      timeToContact: undefined,
      pitchType: "Fastball",
      additionalContext: "",
    });
  };

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-4">
        <h3 className="font-sans text-lg font-medium mb-4">Swing Stats & Context</h3>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batSpeed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Bat Speed (mph)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="75.0"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="exitVelocity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Exit Velocity (mph)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="85.0"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="launchAngle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Launch Angle (degrees)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="15.0"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="attackAngle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Attack Angle (degrees)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="10.0"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="timeToContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Time To Contact (sec)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.15"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="pitchType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Pitch Type
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pitch type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fastball">Fastball</SelectItem>
                        <SelectItem value="Curveball">Curveball</SelectItem>
                        <SelectItem value="Slider">Slider</SelectItem>
                        <SelectItem value="Changeup">Changeup</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="additionalContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">
                    Additional Context
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any specific concerns or areas you're working on..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={clearForm}
                className="text-slate-500 hover:text-slate-700"
              >
                Clear Form
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-blue-700 text-white"
              >
                {isSubmitting ? "Saving..." : "Save Stats"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
