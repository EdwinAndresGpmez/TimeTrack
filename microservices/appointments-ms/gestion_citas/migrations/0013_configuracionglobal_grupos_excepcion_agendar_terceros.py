from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("gestion_citas", "0012_alter_configuracionglobal_workflow_citas"),
    ]

    operations = [
        migrations.AddField(
            model_name="configuracionglobal",
            name="grupos_excepcion_agendar_terceros",
            field=models.TextField(
                default="Administrador, Recepcion",
                help_text="Grupos autorizados para agendar citas a nombre de otros pacientes.",
            ),
        ),
    ]

