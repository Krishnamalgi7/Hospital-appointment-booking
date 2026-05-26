from django.urls import path

from .views import (
    register_view,
    login_view,
    logout_view,

    admin_dashboard,
    doctor_dashboard,
    patient_dashboard
)

urlpatterns = [

    path(
        'register/',
        register_view,
        name='register'
    ),

    path(
        'login/',
        login_view,
        name='login'
    ),

    path(
        'logout/',
        logout_view,
        name='logout'
    ),

    path(
        'admin-dashboard/',
        admin_dashboard,
        name='admin-dashboard'
    ),

    path(
        'doctor-dashboard/',
        doctor_dashboard,
        name='doctor-dashboard'
    ),

    path(
        'patient-dashboard/',
        patient_dashboard,
        name='patient-dashboard'
    ),
]