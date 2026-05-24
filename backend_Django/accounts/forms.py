from django import forms
from django.contrib.auth.forms import UserCreationForm

from .models import User, Patient


class PatientRegisterForm(UserCreationForm):

    username = forms.CharField(
    label='Full Name',
    max_length=50
    )

    age = forms.IntegerField(label="Age")

    gender = forms.ChoiceField(
        choices=Patient.GENDER_CHOICES
    )

    blood_group = forms.ChoiceField(
    choices=Patient.BLOOD_GROUP_CHOICES
    )

    address = forms.CharField(max_length=255)

    phone = forms.CharField(max_length=15)

    class Meta:

        model = User

        fields = [
            'username',
            'email',
            'password1',
            'password2',
            'age',
            'gender',
            'blood_group',
            'phone',
            'address',
        ]


class LoginForm(forms.Form):

    email = forms.EmailField()

    password = forms.CharField(
        widget=forms.PasswordInput
    )