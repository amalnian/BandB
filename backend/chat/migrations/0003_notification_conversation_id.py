# Generated by Django 5.2 on 2025-07-24 09:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0002_alter_notification_options_notification_is_read_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='conversation_id',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
