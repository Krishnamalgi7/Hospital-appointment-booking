from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, Patient, Doctor


admin.site.register(User, UserAdmin)
admin.site.register(Patient)
admin.site.register(Doctor)
