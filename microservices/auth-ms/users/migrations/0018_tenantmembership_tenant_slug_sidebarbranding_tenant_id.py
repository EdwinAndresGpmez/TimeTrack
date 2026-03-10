from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0017_rename_users_tenant_user_id_4d5232_idx_users_tenan_user_id_e3ec75_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenantmembership",
            name="tenant_slug",
            field=models.SlugField(blank=True, db_index=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="sidebarbranding",
            name="tenant_id",
            field=models.BigIntegerField(blank=True, db_index=True, null=True),
        ),
    ]
