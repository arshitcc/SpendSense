import React, {useState} from 'react'
import { ID } from 'appwrite';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import useAuthStore from '@/app/mystore';
import user from '@/appwrite/users';
import transactions from '@/appwrite/transactions';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';

function NewTransaction() {

  const [error, setError] = useState("");
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setTransactionMode] = useState('');
  const [category, setTransactionCategory] = useState('');
  let [isRecurring, setIsRecurring] = useState('');
  let [date, setDate] = useState();
  const userId = useAuthStore((state) => state.user?.$id);
  const navigate = useNavigate();

  const handleNewPayment =  async () => {
    setError('');
    if(
      [amount, category, mode].some((field) => field?.trim() === '')
    ){
      setError(`!! Please Enter all the valid fields !!`);
      return;
    }

    if(category==='Wallet-Deposit' || category==='Refund') isRecurring = `''`;

    const amountPattern = /^\d+(\.\d{1,2})?$/;
    if (!amountPattern.test(amount)) {
      setError('Please enter a valid amount with upto 2 decimal only');
      return;
    }

    if(typeof date === 'undefined') date = new Date();
    const newDate  = date.toISOString();
    const newAmount = parseFloat(amount);

    try {
      const myUser = await user.getUser(userId);
      let remaining_balance = myUser.balance;
      if(category === 'Wallet-Deposit' || category === 'Refund') remaining_balance += newAmount;
      else remaining_balance -= newAmount; 
  
      await transactions.addTransaction({userId, date : newDate, amount : newAmount, mode, category, isRecurring, message, remaining_balance})
      await user.updateBalance({userId, newBalance : remaining_balance});  

      navigate('/');
      
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('An error occurred while updating the transaction. Please try again.');
    }
  }

  const queryClient = useQueryClient();

  const paymentMutation = useMutation({
    mutationFn : handleNewPayment,
    onSuccess: () => {
      console.log("Payment Added - Successfully");
      queryClient.invalidateQueries(['transactions'])
    },
    onError: (error) => {
      console.error("Payment Failed:", error);
    },
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    paymentMutation.mutate();
  }

  return (
    <>
      <div className="mx-auto max-w-screen-sm my-12 p-2">
        <h2 className="text-xl text-center font-semibold text-gray-900 dark:text-white sm:text-2xl">New Payment</h2>

        <div className="my-6 sm:mt-8 lg:flex lg:items-start lg:gap-12">
          <form 
          onSubmit={handleSubmit}
          className="mx-auto w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6 lg:p-8"
          >
            {error && <p className="text-red-600 text-center">{error}</p>}
            <div className="mb-6 grid grid-cols-2 gap-3">

              <div className="col-span-2 grid w-full items-center gap-1.5">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                value = {amount}
                onChange = {(e) => setAmount(e.target.value)} 
                type="amount" id="amount" placeholder="₹ 6900" />
              </div>

              <div className='col-span-2 grid grid-cols-1 md:grid-cols-2 items-center gap-1.5'>
                <div className='col-span-1' id='category'>
                  <Select
                  onValueChange={(value) => setTransactionCategory(value)}
                  required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Tranasaction Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className='underline font-bold'> Expense</SelectLabel>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Bills">Bills</SelectItem>
                        <SelectItem value="Online Shopping">Online Shopping</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="underline font-bold"> Deposit </SelectLabel>
                        <SelectItem value="Wallet-Deposit">Wallet-Deposit</SelectItem>
                        <SelectItem value="Refund">Refund</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className='col-span-1' id='mode'>
                  <Select
                  onValueChange={(value) => setTransactionMode(value)}
                  required
                  >
                    <SelectTrigger className='w-screen-md'>
                      <SelectValue placeholder="Select a Tranasaction Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="underline font-bold"> Transaction Mode</SelectLabel>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="CASH">CASH</SelectItem>
                        <SelectItem value="DEBIT CARD">DEBIT CARD</SelectItem>
                        <SelectItem value="CREDIT CARD">CREDIT CARD</SelectItem>
                        <SelectItem value="NET BANKING">NET BANKING</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              

              <div className='col-span-2 grid w-full items-center gap-1.5'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Transaction date (by deafult Today)</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      showOutsideDays={false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {
                !(category?.trim()==='' || category==='Wallet-Deposit' ||category==='Refund') && (
                  <div className='col-span-2'>
                    <Select
                    onValueChange={(value) => setIsRecurring(value)}
                    required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Is this a regular Transaction ?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              <div className='col-span-2' id="message" >

                <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"> Transaction Message (optional) </label>

                <Input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                type="text" 
                placeholder="Flight : VNS - TIR"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500" 
                />
              </div>
              
              
            </div>

            <Button type="submit">Add Transaction</Button>
          </form>

        </div>
      </div>
    </>
  )
}

export default NewTransaction;