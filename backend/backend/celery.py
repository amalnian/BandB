# celery.py in your project root
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.conf.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0',
    accept_content=['json'],
    task_serializer='json',
    result_serializer='json',
    timezone='UTC',
    broker_connection_retry_on_startup=True,
    # Ensure we're using Redis transport
    broker_transport='redis',
)

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')