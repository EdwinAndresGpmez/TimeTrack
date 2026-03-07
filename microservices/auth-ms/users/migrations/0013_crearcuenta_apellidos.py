from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0012_alter_auditoria_fecha"),
    ]

    operations = [
        migrations.AddField(
            model_name="crearcuenta",
            name="apellidos",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
