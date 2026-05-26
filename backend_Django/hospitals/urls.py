from django.urls import path

from .views import (
    hospital_list,
    create_hospital,
    update_hospital,
    delete_hospital
)

urlpatterns = [

    path(
        '',
        hospital_list,
        name='hospital-list'
    ),

    path(
        'create/',
        create_hospital,
        name='create-hospital'
    ),

    path(
        'update/<int:pk>/',
        update_hospital,
        name='update-hospital'
    ),

    path(
        'delete/<int:pk>/',
        delete_hospital,
        name='delete-hospital'
    ),
]