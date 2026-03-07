from django.db import migrations, models


def seed_tipos_documento(apps, schema_editor):
    TipoDocumento = apps.get_model("users", "TipoDocumento")
    defaults = [
        ("CC", "Cedula"),
        ("TI", "Tarjeta Identidad"),
        ("CE", "Cedula Extranjeria"),
        ("PAS", "Pasaporte"),
    ]
    for idx, (codigo, nombre) in enumerate(defaults, start=1):
        TipoDocumento.objects.get_or_create(
            codigo=codigo,
            defaults={"nombre": nombre, "activo": True, "orden": idx},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0013_crearcuenta_apellidos"),
    ]

    operations = [
        migrations.CreateModel(
            name="TipoDocumento",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("codigo", models.CharField(max_length=20, unique=True)),
                ("nombre", models.CharField(max_length=120)),
                ("activo", models.BooleanField(default=True)),
                ("orden", models.PositiveIntegerField(default=0)),
            ],
            options={
                "ordering": ("orden", "nombre"),
            },
        ),
        migrations.RunPython(seed_tipos_documento, migrations.RunPython.noop),
    ]
