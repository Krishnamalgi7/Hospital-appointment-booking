from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):

    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('doctor', 'Doctor'),
        ('patient', 'Patient'),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )

    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} - {self.role}"

class Patient(models.Model):

    GENDER_CHOICES = (
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    )

    BLOOD_GROUP_CHOICES = (
    ('A+', 'A+'),
    ('A-', 'A-'),
    ('B+', 'B+'),
    ('B-', 'B-'),
    ('O+', 'O+'),
    ('O-', 'O-'),
    ('AB+', 'AB+'),
    ('AB-', 'AB-'),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    age = models.PositiveIntegerField()

    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES
    )


    blood_group = models.CharField(
        max_length=5,
        choices=BLOOD_GROUP_CHOICES
    )

    address = models.TextField()

    phone = models.CharField(
        max_length=15
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.user.email

class Doctor(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    hospital = models.ForeignKey(
        'hospitals.Hospital',
        on_delete=models.CASCADE
    )

    specialization = models.CharField(
        max_length=255
    )

    phone = models.CharField(
        max_length=15
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.user.email
