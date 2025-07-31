from django.core.management.base import BaseCommand
from django.utils import timezone
from shop.models import TemporarySlotReservation

class Command(BaseCommand):
    help = 'Clean up expired slot reservations'
    
    def handle(self, *args, **options):
        deleted_count = TemporarySlotReservation.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()[0]
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully cleaned up {deleted_count} expired reservations'
            )
        )