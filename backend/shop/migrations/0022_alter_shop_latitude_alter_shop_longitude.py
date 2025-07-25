# Generated by Django 5.2 on 2025-06-14 07:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0021_booking_payment_method'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shop',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=9, max_digits=12, null=True),
        ),
        migrations.AlterField(
            model_name='shop',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=9, max_digits=12, null=True),
        ),
    ]
