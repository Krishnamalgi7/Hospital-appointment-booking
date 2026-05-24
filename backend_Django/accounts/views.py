from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout

from .forms import PatientRegisterForm, LoginForm
from .models import Patient


def register_view(request):

    form = PatientRegisterForm()

    if request.method == 'POST':

        form = PatientRegisterForm(request.POST)

        if form.is_valid():

            user = form.save(commit=False)

            user.role = 'patient'

            user.save()

            Patient.objects.create(
                user=user,
                age=form.cleaned_data['age'],
                gender=form.cleaned_data['gender'],
                blood_group=form.cleaned_data['blood_group'],
                address=form.cleaned_data['address'],
                phone=form.cleaned_data['phone']
            )

            return redirect('login')

    return render(
        request,
        'accounts/register.html',
        {'form': form}
    )


def login_view(request):

    form = LoginForm()

    if request.method == 'POST':

        form = LoginForm(request.POST)

        if form.is_valid():

            email = form.cleaned_data['email']

            password = form.cleaned_data['password']

            user = authenticate(
                request,
                email=email,
                password=password
            )

            if user:

                login(request, user)

                return redirect('home')

    return render(
        request,
        'accounts/login.html',
        {'form': form}
    )


def logout_view(request):

    logout(request)

    return redirect('login')