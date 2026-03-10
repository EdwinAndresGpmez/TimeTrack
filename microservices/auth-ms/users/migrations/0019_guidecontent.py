from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0018_tenantmembership_tenant_slug_sidebarbranding_tenant_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="GuideContent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.CharField(db_index=True, max_length=120, unique=True)),
                ("title", models.CharField(max_length=180)),
                ("content", models.JSONField(blank=True, default=dict)),
                ("is_active", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ("key",),
            },
        ),
    ]

