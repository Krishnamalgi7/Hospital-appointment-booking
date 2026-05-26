from django.shortcuts import (
    render,
    redirect,
    get_object_or_404
)

from .models import Hospital
from .forms import HospitalForm


def hospital_list(request):

    hospitals = Hospital.objects.all()

    return render(
        request,
        'hospitals/hospital_list.html',
        {
            'hospitals': hospitals
        }
    )


def create_hospital(request):

    form = HospitalForm()

    if request.method == 'POST':

        form = HospitalForm(request.POST)

        if form.is_valid():

            form.save()

            return redirect('hospital-list')

    return render(
        request,
        'hospitals/create_hospital.html',
        {
            'form': form
        }
    )


def update_hospital(request, pk):

    hospital = get_object_or_404(
        Hospital,
        id=pk
    )

    form = HospitalForm(instance=hospital)

    if request.method == 'POST':

        form = HospitalForm(
            request.POST,
            instance=hospital
        )

        if form.is_valid():

            form.save()

            return redirect('hospital-list')

    return render(
        request,
        'hospitals/update_hospital.html',
        {
            'form': form
        }
    )


def delete_hospital(request, pk):

    hospital = get_object_or_404(
        Hospital,
        id=pk
    )

    hospital.delete()

    return redirect('hospital-list')