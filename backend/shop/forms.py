from django.forms import ModelForm, IntegerField
from django import forms
from .models import Service

class ServiceForm(ModelForm):
    """Form for creating and updating services."""
    
    # Field to explicitly set how many slots the service requires
    slots_required = forms.IntegerField(
        min_value=1,
        required=False,  # Not required as it will be calculated automatically
        help_text="Number of continuous time slots this service requires. "
                 "This will be calculated automatically based on duration."
    )
    
    # Custom field for setting slot size
    slot_size = forms.IntegerField(
        min_value=5,
        initial=30,
        required=False,
        help_text="Size of each appointment slot in minutes. Default is 30 minutes."
    )
    
    class Meta:
        model = Service
        fields = ['name', 'description', 'price', 'duration_minutes', 'slots_required', 'slot_size', 'is_active']
        widgets = {
            'duration_minutes': forms.NumberInput(attrs={'min': '5', 'step': '5'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # If editing an existing service, populate the slot_size field
        if self.instance and self.instance.pk:
            self.fields['slot_size'].initial = self.instance.default_slot_size
            
    def save(self, commit=True):
        service = super().save(commit=False)
        
        # Update default_slot_size if provided
        slot_size = self.cleaned_data.get('slot_size')
        if slot_size:
            service.default_slot_size = slot_size
        
        # Allow manual override of slots_required if provided
        slots_required = self.cleaned_data.get('slots_required')
        if slots_required:
            service.slots_required = slots_required
        
        if commit:
            service.save()
        return service